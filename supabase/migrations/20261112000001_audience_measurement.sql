-- Mesure d'audience facultative.
--
-- Cette table ne contient que des compteurs agrégés : un jour, un chemin de
-- page publique, un nombre de consultations. Elle ne contient ni identifiant,
-- ni adresse IP, ni donnée personnelle, et n'est jamais lue par l'application.
--
-- L'écriture passe obligatoirement par la fonction `register_audience_visit` :
-- le rôle anonyme ne reçoit aucun droit direct sur la table, ce qui empêche
-- la falsification des compteurs depuis le navigateur. La fonction applique
-- elle-même une liste blanche des pages mesurables.
--
-- La mesure n'est déclenchée qu'après consentement explicite de
-- l'internaute : le client n'appelle cette fonction qu'une fois le
-- consentement accordé, et il ne mesure que les pages publiques listées.
--
-- Le modèle reprend celui du journal d'audit : RLS activée et forcée, rôle
-- interne sans contournement, fonction sécurisée appartenant à ce rôle, et
-- politiques d'écriture restrictedes.

create table if not exists public.audience_daily (
  id bigint generated always as identity primary key,
  day date not null,
  path text not null,
  visits integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint audience_daily_day_path_key unique (day, path),
  constraint audience_daily_visits_positive check (visits >= 0)
);

comment on table public.audience_daily is
  'Compteurs agrégés de consultation des pages publiques, alimentés après consentement.';

alter table public.audience_daily enable row level security;
alter table public.audience_daily force row level security;

-- Aucun droit direct pour les rôles applicatifs : la table n'est ni lue ni
-- écrite en dehors de la fonction sécurisée.
revoke all on table public.audience_daily from anon, authenticated;

-- Seul le rôle interne peut écrire. Il ne possède pas la table et ne
-- contourne pas les politiques : c'est la politique qui l'autorise.
--
-- Le droit de lecture est nécessaire : l'incrémentation d'un compteur lit
-- la valeur courante. Il ne porte que sur des compteurs agrégés, sans
-- donnée personnelle, et le rôle interne ne peut pas se connecter.
grant select, insert, update on public.audience_daily to school_manage_internal;

create policy audience_daily_internal_read
on public.audience_daily for select
to school_manage_internal
using (true);

create policy audience_daily_internal_insert
on public.audience_daily for insert
to school_manage_internal
with check (true);

create policy audience_daily_internal_update
on public.audience_daily for update
to school_manage_internal
using (true)
with check (true);

create or replace function public.register_audience_visit(p_path text)
returns void
language plpgsql
security definer
set search_path = ''
set row_security = on
as $$
declare
  v_day date := (now() at time zone 'utc')::date;
  v_path text;
begin
  v_path := lower(trim(coalesce(p_path, '')));

  if v_path = '' then
    v_path := '/';
  end if;

  -- Liste blanche des pages publiques mesurables. Tout ce qui se trouve
  -- derrière une authentification est exclu : la mesure ne suit jamais une
  -- personne identifiée.
  if v_path not in (
    '/',
    '/connexion',
    '/conditions',
    '/confidentialite',
    '/hors-ligne'
  ) then
    return;
  end if;

  insert into public.audience_daily (day, path, visits)
  values (v_day, v_path, 1)
  on conflict (day, path) do update
    set visits = public.audience_daily.visits + 1,
        updated_at = now();
end;
$$;

comment on function public.register_audience_visit(text) is
  'Incrémente le compteur de consultations d''une page publique autorisée.';

alter function public.register_audience_visit(text) owner to school_manage_internal;
revoke all on function public.register_audience_visit(text) from public;
grant execute on function public.register_audience_visit(text) to anon;
