-- Adds guardrails for push token storage.
-- Safe to run on an existing project: normalizes existing rows, then enforces constraints.

begin;

-- 1) Normalize existing values to avoid CHECK constraint failures.
update public.device_push_tokens
set platform = trim(lower(platform))
where platform is not null
  and platform <> trim(lower(platform));

-- 2) Enforce normalized platform values (prevents 'ios ' etc.).
alter table public.device_push_tokens
  drop constraint if exists device_push_tokens_platform_normalized_chk;

alter table public.device_push_tokens
  add constraint device_push_tokens_platform_normalized_chk
  check (platform = trim(lower(platform)));

-- 3) Ensure upsert(onConflict: 'token') works reliably.
create unique index if not exists device_push_tokens_token_key
  on public.device_push_tokens (token);

commit;
