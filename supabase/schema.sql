create table if not exists public.line_group_messages (
  id bigint generated always as identity primary key,
  line_event_id text,
  reply_token text,
  source_type text,
  group_id text,
  room_id text,
  user_id text,
  message_id text,
  message_type text not null,
  text text,
  category text not null default 'general',
  severity text not null default 'C',
  media_file_name text,
  media_file_size bigint,
  media_content_type text,
  media_storage_bucket text,
  media_storage_path text,
  media_download_error text,
  task_id bigint,
  occurred_at timestamptz not null default now(),
  raw_event jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.line_group_messages
  add column if not exists media_file_name text,
  add column if not exists media_file_size bigint,
  add column if not exists media_content_type text,
  add column if not exists media_storage_bucket text,
  add column if not exists media_storage_path text,
  add column if not exists media_download_error text,
  add column if not exists task_id bigint;

alter table public.line_group_messages
  alter column category set default 'general';

create table if not exists public.line_tasks (
  id bigint generated always as identity primary key,
  group_id text not null,
  source_type text,
  category text not null,
  severity text not null default 'C',
  status text not null default 'open',
  title text not null,
  owner_name text,
  first_message_id bigint references public.line_group_messages(id),
  latest_message_id bigint references public.line_group_messages(id),
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.line_task_events (
  id bigint generated always as identity primary key,
  task_id bigint not null references public.line_tasks(id) on delete cascade,
  message_id bigint references public.line_group_messages(id),
  event_type text not null,
  note text,
  created_at timestamptz not null default now()
);

alter table public.line_group_messages
  drop constraint if exists line_group_messages_task_id_fkey;

alter table public.line_group_messages
  add constraint line_group_messages_task_id_fkey
  foreign key (task_id) references public.line_tasks(id);

create index if not exists line_group_messages_occurred_at_idx
  on public.line_group_messages (occurred_at desc);

create index if not exists line_group_messages_group_id_idx
  on public.line_group_messages (group_id);

create index if not exists line_group_messages_category_idx
  on public.line_group_messages (category);

create index if not exists line_group_messages_task_id_idx
  on public.line_group_messages (task_id);

create index if not exists line_tasks_group_status_idx
  on public.line_tasks (group_id, status, updated_at desc);

create index if not exists line_tasks_due_at_idx
  on public.line_tasks (due_at);

insert into storage.buckets (id, name, public)
values ('line-media', 'line-media', false)
on conflict (id) do nothing;
