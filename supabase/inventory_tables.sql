create table if not exists public.store_inventory_records (
  id bigint generated always as identity primary key,
  message_id bigint not null unique references public.line_group_messages(id) on delete cascade,
  group_id text,
  store_name text,
  report_date_text text,
  source_text text,
  created_at timestamptz not null default now()
);

create table if not exists public.store_inventory_items (
  id bigint generated always as identity primary key,
  inventory_record_id bigint not null references public.store_inventory_records(id) on delete cascade,
  item_name text not null,
  frozen_quantity numeric,
  frozen_unit text,
  chilled_quantity numeric,
  chilled_unit text,
  safety_quantity numeric,
  safety_unit text,
  note text,
  raw_line text,
  created_at timestamptz not null default now()
);

create table if not exists public.beverage_inventory_records (
  id bigint generated always as identity primary key,
  message_id bigint not null unique references public.line_group_messages(id) on delete cascade,
  group_id text,
  store_name text,
  report_date_text text,
  source_text text,
  promotion_flag boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.beverage_inventory_items (
  id bigint generated always as identity primary key,
  beverage_record_id bigint not null references public.beverage_inventory_records(id) on delete cascade,
  beverage_name text not null,
  line_date_text text,
  inbound_cases numeric,
  counted_bottles numeric,
  raw_line text,
  created_at timestamptz not null default now()
);

alter table public.store_inventory_records enable row level security;
alter table public.store_inventory_items enable row level security;
alter table public.beverage_inventory_records enable row level security;
alter table public.beverage_inventory_items enable row level security;

grant select, insert, update, delete on public.store_inventory_records to service_role;
grant select, insert, update, delete on public.store_inventory_items to service_role;
grant select, insert, update, delete on public.beverage_inventory_records to service_role;
grant select, insert, update, delete on public.beverage_inventory_items to service_role;

grant usage, select on all sequences in schema public to service_role;

create index if not exists store_inventory_records_store_date_idx
  on public.store_inventory_records (store_name, created_at desc);

create index if not exists store_inventory_records_group_idx
  on public.store_inventory_records (group_id, created_at desc);

create index if not exists store_inventory_items_item_idx
  on public.store_inventory_items (item_name);

create index if not exists beverage_inventory_records_store_date_idx
  on public.beverage_inventory_records (store_name, created_at desc);

create index if not exists beverage_inventory_records_group_idx
  on public.beverage_inventory_records (group_id, created_at desc);

create index if not exists beverage_inventory_items_name_idx
  on public.beverage_inventory_items (beverage_name);
