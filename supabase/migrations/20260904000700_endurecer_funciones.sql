-- Endurecimiento de funciones, a partir de lo que reporta el linter de Supabase.

-- ── 1. search_path fijo en todas las funciones ───────────────────────────────
--
-- Una función sin `search_path` explícito resuelve los nombres de tabla con el
-- search_path de quien la llama. En una SECURITY DEFINER eso permite
-- secuestrarla creando objetos homónimos en un esquema que venga antes; en una
-- SECURITY INVOKER es menos grave pero igual conviene que sea determinística.
--
-- Se recorren todas las funciones de `public` que todavía no lo tengan seteado,
-- así también quedan cubiertas las que ya existían (`fn_set_updated_at`).

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as firma
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prokind = 'f'
       and not exists (
         select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search\_path=%'
       )
  loop
    execute format('alter function %s set search_path = public', f.firma);
  end loop;
end $$;

-- ── 2. Las funciones de trigger no tienen por qué ser llamables por la API ───
--
-- PostgREST publica todo lo que viva en `public` bajo /rest/v1/rpc/. Las
-- funciones de trigger quedaban expuestas ahí, y encima son SECURITY DEFINER.
-- Llamarlas directamente falla igual (PostgreSQL exige contexto de trigger),
-- pero no hay motivo para dejarlas publicadas.
--
-- Revocar EXECUTE no afecta a los triggers: el motor los ejecuta sin comprobar
-- ese permiso.

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as firma
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prorettype = 'trigger'::regtype
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.firma);
  end loop;
end $$;

-- ── 3. Los helpers de rol sólo para usuarios logueados ───────────────────────
--
-- `is_admin()`, `get_user_rol()` e `is_vendedor_or_above()` devuelven el rol de
-- quien llama, así que un usuario anónimo no tiene nada que hacer con ellas.
-- Se mantiene el permiso para `authenticated` porque las políticas RLS las
-- evalúan con los privilegios del usuario: sin EXECUTE, RLS dejaría de andar.

revoke all on function public.is_admin()             from public, anon;
revoke all on function public.get_user_rol()         from public, anon;
revoke all on function public.is_vendedor_or_above() from public, anon;
revoke all on function public.siguiente_numero(text) from public, anon;

grant execute on function public.is_admin()             to authenticated;
grant execute on function public.get_user_rol()         to authenticated;
grant execute on function public.is_vendedor_or_above() to authenticated;
grant execute on function public.siguiente_numero(text) to authenticated;

-- ── Pendiente fuera de SQL ───────────────────────────────────────────────────
--
-- El linter también marca "Leaked Password Protection Disabled". Eso no se
-- arregla con una migración, y además requiere plan Pro: la organización está
-- en Free, así que el interruptor ni siquiera aparece. Vive en
-- Authentication > Sign In / Providers > Email.
--
-- Lo que sí se puede configurar en Free, en esa misma pantalla: longitud
-- mínima de contraseña y caracteres requeridos.
