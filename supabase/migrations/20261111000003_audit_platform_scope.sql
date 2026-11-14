-- Étape 6 — Journal d'audit compatible avec les profils hors école.
--
-- Le rôle de supervision globale n'appartient à aucune école (`school_id` nul).
-- Le journal d'audit est rattaché à une école (`school_id` non nul) : une ligne
-- sans périmètre école ne peut donc pas y être consignée. La fonction d'audit
-- ignore ces lignes au lieu d'échouer et de faire échouer l'écriture métier.
--
-- Comme les autres helpers, la fonction ne dépend pas du schéma Auth : elle
-- relit les claims publics de la requête.

grant school_manage_internal to postgres;
grant usage, create on schema public to school_manage_internal;

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
  -- set_updated_at laisse NEW identique à OLD pour un UPDATE sans changement.
  -- Sortir avant toute conversion JSONB évite alors le coût d'audit inutile.
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

  -- Périmètre plateforme (profil de supervision globale) : hors journal des
  -- écoles, qui n'a pas de dimension school_id.
  if audit_school_id is null then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
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

alter function public.audit_business_change() owner to school_manage_internal;
revoke all on function public.audit_business_change() from public;

revoke create on schema public from school_manage_internal;
revoke school_manage_internal from postgres;
