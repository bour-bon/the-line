-- THE LINE: database schema for the public site.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run.

------------------------------------------------------------------
-- Votes: one line per visitor (an anonymous Supabase account).
-- Nobody can read anyone else's vote; everyone can read the totals.
------------------------------------------------------------------
create table if not exists public.votes (
  voter      uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  pos        smallint not null check (pos between 0 and 8),
  updated_at timestamptz not null default now()
);
alter table public.votes enable row level security;

drop policy if exists "votes: read own"   on public.votes;
drop policy if exists "votes: insert own" on public.votes;
drop policy if exists "votes: update own" on public.votes;
create policy "votes: read own"   on public.votes for select to authenticated using (voter = auth.uid());
create policy "votes: insert own" on public.votes for insert to authenticated with check (voter = auth.uid());
create policy "votes: update own" on public.votes for update to authenticated using (voter = auth.uid()) with check (voter = auth.uid());

create or replace function public.votes_stamp() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists votes_stamp on public.votes;
create trigger votes_stamp before insert or update on public.votes
  for each row execute function public.votes_stamp();

-- Totals per line position, readable by everyone.
create or replace function public.vote_counts()
returns table (pos smallint, n bigint)
language sql stable security definer set search_path = public as $$
  select v.pos, count(*)::bigint from public.votes v group by v.pos order by v.pos
$$;
revoke all on function public.vote_counts() from public;
grant execute on function public.vote_counts() to anon, authenticated;

------------------------------------------------------------------
-- Evidence wall: links that support or challenge the page.
-- Everyone reads visible links; people add and delete only their own.
-- To moderate, set hidden = true in the Table Editor.
------------------------------------------------------------------
create table if not exists public.evidence (
  id         bigint generated always as identity primary key,
  author     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  url        text not null check (char_length(url) <= 500 and url ~* '^https?://[^[:space:]]+$'),
  title      text not null default '' check (char_length(title) <= 120),
  note       text not null default '' check (char_length(note) <= 200),
  stance     text not null check (stance in ('support','challenge')),
  section    text not null default 'general'
             check (section in ('money','energy','water','minerals','sub','uses','general')),
  hidden     boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists evidence_created_idx on public.evidence (created_at desc);
create index if not exists evidence_author_idx  on public.evidence (author);
alter table public.evidence enable row level security;

drop policy if exists "evidence: read visible" on public.evidence;
drop policy if exists "evidence: insert own"   on public.evidence;
drop policy if exists "evidence: delete own"   on public.evidence;
create policy "evidence: read visible" on public.evidence for select to anon, authenticated
  using (hidden = false or author = auth.uid());
create policy "evidence: insert own"   on public.evidence for insert to authenticated
  with check (author = auth.uid());
create policy "evidence: delete own"   on public.evidence for delete to authenticated
  using (author = auth.uid());
-- No update policy: posts can't be edited, only deleted and re-posted.

-- Spam limits: at most 10 links per person, one every 30 seconds.
-- Also stops clients from faking the timestamp or un-hiding themselves.
create or replace function public.evidence_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.created_at := now();
  new.hidden := false;
  if (select count(*) from public.evidence where author = new.author) >= 10 then
    raise exception 'limit_reached';
  end if;
  if exists (select 1 from public.evidence
             where author = new.author and created_at > now() - interval '30 seconds') then
    raise exception 'too_fast';
  end if;
  return new;
end $$;
drop trigger if exists evidence_guard on public.evidence;
create trigger evidence_guard before insert on public.evidence
  for each row execute function public.evidence_guard();
