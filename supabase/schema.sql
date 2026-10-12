-- Run once in the Supabase SQL editor. Safe to re-run.
create table if not exists public.personal_spaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  version bigint not null default 1,
  updated_at timestamptz not null default now(),
  constraint personal_space_size check (octet_length(data::text) <= 2000000)
);
alter table public.personal_spaces enable row level security;
revoke all on public.personal_spaces from anon;
grant select, insert, update on public.personal_spaces to authenticated;
drop policy if exists own_space_read on public.personal_spaces;
create policy own_space_read on public.personal_spaces for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists own_space_insert on public.personal_spaces;
create policy own_space_insert on public.personal_spaces for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists own_space_update on public.personal_spaces;
create policy own_space_update on public.personal_spaces for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- Optimistic concurrency: a stale device must not overwrite newer saved data.
create or replace function public.save_personal_space(p_data jsonb, p_version bigint)
returns setof public.personal_spaces language plpgsql security invoker set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Login required'; end if;
  if p_version = 0 then
    return query insert into public.personal_spaces(user_id,data,version)
      values(auth.uid(),p_data,1) on conflict(user_id) do nothing returning *;
  else
    return query update public.personal_spaces set data=p_data, version=version+1, updated_at=now()
      where user_id=auth.uid() and version=p_version returning *;
  end if;
end;
$$;
revoke all on function public.save_personal_space(jsonb,bigint) from public, anon;
grant execute on function public.save_personal_space(jsonb,bigint) to authenticated;

-- Bound AI calls to 20 per account per hour.
create table if not exists public.assistant_usage (
 user_id uuid references auth.users(id) on delete cascade,
 hour_start timestamptz not null,
 requests integer not null default 1,
 primary key(user_id,hour_start)
);
alter table public.assistant_usage enable row level security;
revoke all on public.assistant_usage from anon, authenticated;
create or replace function public.claim_assistant_request()
returns boolean language plpgsql security definer set search_path = public as $$
declare claimed integer;
begin
 if auth.uid() is null then return false; end if;
 insert into public.assistant_usage(user_id,hour_start,requests)
 values(auth.uid(),date_trunc('hour',now()),1)
 on conflict(user_id,hour_start) do update set requests=assistant_usage.requests+1
 where assistant_usage.requests < 20 returning requests into claimed;
 return claimed is not null;
end;
$$;
revoke all on function public.claim_assistant_request() from public,anon;
grant execute on function public.claim_assistant_request() to authenticated;
