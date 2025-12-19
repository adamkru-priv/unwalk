-- ============================================
-- MOVEE: Push preferences (global on/off) + more push types
-- Migration 043 (docs-only)
--
-- Safe approach:
-- - Adds a single global boolean flag on public.users.
-- - Extends push_outbox.type to include assignment events.
-- - Adds triggers on challenge_assignments and user_challenges.
-- ============================================

begin;

-- 1) Global setting in profile
alter table public.users
  add column if not exists push_enabled boolean not null default true;

comment on column public.users.push_enabled is 'Global push notification toggle (true=send, false=do not send)';

-- 2) Extend push_outbox type constraint
-- If push_outbox was created with a CHECK constraint, we need to replace it.
alter table public.push_outbox
  drop constraint if exists push_outbox_type_check;

alter table public.push_outbox
  add constraint push_outbox_type_check
  check (type in (
    'challenge_started',
    'challenge_completed',
    'challenge_assigned',
    'challenge_assignment_accepted',
    'challenge_assignment_rejected',
    'challenge_assignment_started'
  ));

-- ============================================
-- 3) Trigger: challenge assigned (on INSERT into challenge_assignments)
-- ============================================
create or replace function public.enqueue_challenge_assigned_push()
returns trigger
security definer
set search_path = public
as $$
declare
  v_sender_name text;
  v_title text;
begin
  -- Only for real users (recipient_id is required in schema)

  select coalesce(u.display_name, 'Ktoś') into v_sender_name
  from public.users u
  where u.id = new.sender_id;

  select coalesce(ac.title, 'Challenge') into v_title
  from admin_challenges ac
  where ac.id = new.admin_challenge_id;

  insert into public.push_outbox (user_id, type, title, body, data)
  values (
    new.recipient_id,
    'challenge_assigned',
    'Nowe wyzwanie!',
    v_sender_name || ' wysłał Ci wyzwanie: ' || v_title,
    jsonb_build_object(
      'type', 'challenge_assigned',
      'assignment_id', new.id,
      'sender_id', new.sender_id,
      'recipient_id', new.recipient_id,
      'admin_challenge_id', new.admin_challenge_id
    )
  );

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_push_challenge_assigned on public.challenge_assignments;
create trigger trg_push_challenge_assigned
  after insert on public.challenge_assignments
  for each row
  execute function public.enqueue_challenge_assigned_push();

-- ============================================
-- 4) Trigger: assignment accepted/rejected (on UPDATE challenge_assignments)
-- ============================================
create or replace function public.enqueue_challenge_assignment_status_push()
returns trigger
security definer
set search_path = public
as $$
declare
  v_recipient_name text;
  v_title text;
  v_type text;
  v_body text;
begin
  if old.status = new.status then
    return new;
  end if;

  if new.status not in ('accepted', 'rejected') then
    return new;
  end if;

  select coalesce(u.display_name, 'Użytkownik') into v_recipient_name
  from public.users u
  where u.id = new.recipient_id;

  select coalesce(ac.title, 'Challenge') into v_title
  from admin_challenges ac
  where ac.id = new.admin_challenge_id;

  if new.status = 'accepted' then
    v_type := 'challenge_assignment_accepted';
    v_body := v_recipient_name || ' zaakceptował wyzwanie: ' || v_title;
  else
    v_type := 'challenge_assignment_rejected';
    v_body := v_recipient_name || ' odrzucił wyzwanie: ' || v_title;
  end if;

  insert into public.push_outbox (user_id, type, title, body, data)
  values (
    new.sender_id,
    v_type,
    'MOVEE',
    v_body,
    jsonb_build_object(
      'type', v_type,
      'assignment_id', new.id,
      'sender_id', new.sender_id,
      'recipient_id', new.recipient_id,
      'admin_challenge_id', new.admin_challenge_id,
      'status', new.status
    )
  );

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_push_challenge_assignment_status on public.challenge_assignments;
create trigger trg_push_challenge_assignment_status
  after update on public.challenge_assignments
  for each row
  execute function public.enqueue_challenge_assignment_status_push();

-- ============================================
-- 5) Trigger: recipient started an assigned challenge
-- - Fires when a user_challenges row is inserted with assigned_by set.
-- - Notifies the sender (assigned_by) that the recipient started the challenge.
-- - Best-effort links to challenge_assignments via user_challenge_id where available.
-- ============================================

create or replace function public.enqueue_challenge_assignment_started_push()
returns trigger
security definer
set search_path = public
as $$
declare
  v_recipient_name text;
  v_title text;
  v_assignment_id uuid;
begin
  -- Only for social/assigned challenges
  if new.assigned_by is null then
    return new;
  end if;

  select coalesce(u.display_name, 'Użytkownik') into v_recipient_name
  from public.users u
  where u.id = new.user_id;

  select coalesce(ac.title, 'Challenge') into v_title
  from admin_challenges ac
  where ac.id = new.admin_challenge_id;

  -- Best-effort: find the assignment that was accepted and later started.
  select ca.id into v_assignment_id
  from public.challenge_assignments ca
  where ca.user_challenge_id = new.id
  limit 1;

  insert into public.push_outbox (user_id, type, title, body, data)
  values (
    new.assigned_by,
    'challenge_assignment_started',
    'MOVEE',
    v_recipient_name || ' rozpoczął wyzwanie: ' || v_title,
    jsonb_build_object(
      'type', 'challenge_assignment_started',
      'assignment_id', v_assignment_id,
      'sender_id', new.assigned_by,
      'recipient_id', new.user_id,
      'user_challenge_id', new.id,
      'admin_challenge_id', new.admin_challenge_id
    )
  );

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_push_challenge_assignment_started on public.user_challenges;
create trigger trg_push_challenge_assignment_started
  after insert on public.user_challenges
  for each row
  when (new.assigned_by is not null)
  execute function public.enqueue_challenge_assignment_started_push();

commit;
