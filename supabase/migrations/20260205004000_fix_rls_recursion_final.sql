-- Final fix for RLS Infinite Recursion
-- This migration cleans up ALL previous attempts and applies the denormalization pattern robustly.

-- 1. Drop ALL potential zombie policies to ensure a clean slate
-- Documents policies
drop policy if exists "Users can populate their own documents" on documents;
drop policy if exists "Users can view own or shared documents" on documents;
drop policy if exists "Users can update own or shared documents" on documents;
drop policy if exists "Users can delete their own documents" on documents;
drop policy if exists "Users can view documents they own or collaborate on" on documents;
drop policy if exists "Users can update documents they own or collaborate on" on documents;
drop policy if exists "Users can view their own documents" on documents; -- From initial migrations
drop policy if exists "Users can update their own documents" on documents; -- From initial migrations

-- Collaborators policies
drop policy if exists "Owners can manage collaborators" on document_collaborators;
drop policy if exists "Collaborators can view list" on document_collaborators;

-- 2. Drop potentially problematic functions
drop function if exists public.is_collaborator(uuid);
drop function if exists public.is_owner(uuid);
drop function if exists public.is_collaborator_safe(uuid);

-- 3. Ensure owner_id column exists on document_collaborators (Denormalization)
alter table document_collaborators 
add column if not exists owner_id uuid references auth.users(id);

-- 4. Backfill owner_id
update document_collaborators dc
set owner_id = d.user_id
from documents d
where dc.document_id = d.id
and dc.owner_id is null;

-- 5. Create Trigger for INSERT on document_collaborators (CRITICAL)
create or replace function set_document_collaborator_owner()
returns trigger
language plpgsql
security definer
as $$
begin
    if new.owner_id is null then
      select user_id into new.owner_id
      from documents
      where id = new.document_id;
    end if;
    return new;
end;
$$;

drop trigger if exists set_owner_on_collaborator_insert on document_collaborators;
create trigger set_owner_on_collaborator_insert
before insert on document_collaborators
for each row
execute function set_document_collaborator_owner();

-- 6. Create Trigger for UPDATE on documents (Sync changes)
create or replace function sync_document_owner()
returns trigger
language plpgsql
security definer
as $$
begin
    update document_collaborators
    set owner_id = new.user_id
    where document_id = new.id;
    return new;
end;
$$;

drop trigger if exists on_document_owner_change on documents;
create trigger on_document_owner_change
after update of user_id on documents
for each row
execute function sync_document_owner();

-- 7. Define SAFE Helper Function for Documents Policy
create or replace function public.is_collaborator_safe(doc_id uuid)
returns boolean
language plpgsql
security definer
as $$
begin
  -- SAFE: Query document_collaborators using owner_id or email
  -- Result: boolean
  return exists (
    select 1 from document_collaborators
    where document_id = doc_id
    and lower(user_email) = lower(auth.jwt() ->> 'email')
  );
end;
$$;

-- 8. Apply NEW Safe Policies

-- A. document_collaborators: Check owner_id (No join to documents)
create policy "Collaborators can view list"
  on document_collaborators for select
  using (
    auth.uid() = owner_id OR 
    lower(user_email) = lower(auth.jwt() ->> 'email')
  );

create policy "Owners can manage collaborators"
  on document_collaborators for all
  using (
    auth.uid() = owner_id
  );

-- B. documents: Check user_id OR collaborator (using safe function)
create policy "Users can populate their own documents" 
  on documents for insert
  with check (
    auth.uid() = user_id
  );

create policy "Users can view documents they own or collaborate on"
  on documents for select
  using (
    auth.uid() = user_id OR 
    is_collaborator_safe(id) OR 
    is_public = true
  );

create policy "Users can update documents they own or collaborate on"
  on documents for update
  using (
    auth.uid() = user_id OR 
    is_collaborator_safe(id)
  );

create policy "Users can delete their own documents"
  on documents for delete
  using (
    auth.uid() = user_id
  );
