-- Compatibilité Supabase hébergé : conserver les privilèges minimaux du rôle
-- propriétaire des helpers RLS après le nettoyage de ses appartenances.
-- Aucun accès à auth.users ni à une autre table Auth n’est accordé.

grant usage on schema auth to school_manage_internal;
grant execute on function auth.uid() to school_manage_internal;
