create extension if not exists pgcrypto;

create table if not exists public.products (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    url text not null unique,
    price_regex text,
    target_price numeric(12,2) check (target_price is null or target_price > 0),
    current_price numeric(12,2) check (current_price is null or current_price > 0),
    currency text not null default 'BRL' check (char_length(currency) = 3),
    active boolean not null default true,
    last_title text,
    last_error text,
    last_checked_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.price_history (
    id bigint generated always as identity primary key,
    product_id uuid not null references public.products(id) on delete cascade,
    price numeric(12,2) not null check (price > 0),
    currency text not null default 'BRL' check (char_length(currency) = 3),
    raw_title text,
    source_status integer,
    checked_at timestamptz not null default now()
);

create index if not exists price_history_product_checked_idx
    on public.price_history (product_id, checked_at desc);

alter table public.products enable row level security;
alter table public.price_history enable row level security;

-- MVP: only the server-side secret key accesses these tables through the Data API.
grant select, insert, update, delete on table public.products to service_role;
grant select, insert, update, delete on table public.price_history to service_role;
grant usage, select on all sequences in schema public to service_role;
