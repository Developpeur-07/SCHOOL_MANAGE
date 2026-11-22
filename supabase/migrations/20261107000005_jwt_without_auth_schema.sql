-- Supabase ne conserve pas les GRANT personnalisés sur le schéma auth pour ce
-- rôle interne. Les helpers reproduisent donc exactement la lecture publique
-- des claims utilisée par auth.uid(), sans dépendre de ce schéma.
-- Aucun accès à auth.users n’est ajouté et RLS reste active dans les fonctions.

grant school_manage_internal to postgres;

create or replace function public.is_school_member(target_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = on
as $$
  select exists (
    select 1
    from public.profiles as profile
    where profile.id = (
      select coalesce(
        nullif(current_setting('request.jwt.claim.sub', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
      )::uuid
    )
      and profile.school_id = target_school_id
      and profile.is_active
  );
$$;

create or replace function public.has_school_role(
  target_school_id uuid,
  allowed_roles public.app_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = on
as $$
  select exists (
    select 1
    from public.profiles as profile
    where profile.id = (
      select coalesce(
        nullif(current_setting('request.jwt.claim.sub', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
      )::uuid
    )
      and profile.school_id = target_school_id
      and profile.role = any(allowed_roles)
      and profile.is_active
  );
$$;

revoke all on function public.is_school_member(uuid) from public;
revoke all on function public.has_school_role(uuid, public.app_role[]) from public;
grant execute on function public.is_school_member(uuid) to authenticated;
grant execute on function public.has_school_role(uuid, public.app_role[]) to authenticated;

create or replace function public.audit_business_change()
returns trigger
language plpgsql
security definer
set search_path = ''
set row_security = on
as $$
declare
  row_data jsonb;
  audit_school_id uuid;
  audit_entity_id uuid;
  audit_actor_id uuid;
  fields text[];
begin
  if tg_op = 'UPDATE' and new is not distinct from old then
    return new;
  end if;

  if tg_op = 'DELETE' then
    row_data = to_jsonb(old);
  else
    row_data = to_jsonb(new);
  end if;

  audit_entity_id = (row_data ->> 'id')::uuid;
  if tg_table_name = 'schools' then
    audit_school_id = audit_entity_id;
  else
    audit_school_id = (row_data ->> 'school_id')::uuid;
  end if;

  audit_actor_id = coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  )::uuid;

  if tg_op = 'UPDATE' then
    select coalesce(array_agg(changed.key order by changed.key), '{}')
    into fields
    from (
      select new_values.key
      from jsonb_each(to_jsonb(new)) as new_values
      join jsonb_each(to_jsonb(old)) as old_values using (key)
      where new_values.value is distinct from old_values.value
    ) as changed;
  else
    select coalesce(array_agg(all_values.key order by all_values.key), '{}')
    into fields
    from jsonb_each(row_data) as all_values;
  end if;

  insert into public.audit_log (
    school_id,
    actor_id,
    action,
    entity_table,
    entity_id,
    changed_fields
  ) values (
    audit_school_id,
    audit_actor_id,
    lower(tg_op),
    tg_table_name,
    audit_entity_id,
    fields
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.audit_business_change() from public;

-- Le schéma Auth n’est plus nécessaire au rôle propriétaire des fonctions.
revoke usage on schema auth from school_manage_internal;
revoke school_manage_internal from postgres;
