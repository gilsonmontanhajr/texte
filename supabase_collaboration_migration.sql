-- 1. Add new columns to documents table
alter table documents 
add column if not exists icon text default '📄',
add column if not exists description text;

-- 2. Create collaborators table
create table if not exists document_collaborators (
  id uuid default gen_random_uuid() primary key,
  document_id uuid references documents(id) on delete cascade not null,
  user_email text not null,
  role text not null check (role in ('view', 'edit')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(document_id, user_email)
);

-- 3. Enable RLS on collaborators
alter table document_collaborators enable row level security;

-- 4. RLS Policies for documents

-- Allow users to see documents they own OR are invited to
drop policy if exists "Users can view their own documents" on documents;
create policy "Users can view own or shared documents" on documents for select 
using (
  auth.uid() = user_id 
  OR 
  auth.email() in (
    select user_email from document_collaborators where document_id = id
  )
);

-- Allow users to update documents if they own them OR have 'edit' role
drop policy if exists "Users can update their own documents" on documents;
create policy "Users can update own or shared documents" on documents for update
using (
  auth.uid() = user_id 
  OR 
  exists (
    select 1 from document_collaborators 
    where document_id = id 
    and user_email = auth.email() 
    and role = 'edit'
  )
);

-- Allow owners to delete documents (keep existing logic usually, but let's be explicit)
-- "Users can delete their own documents" should already exist and is correct (only owner).

-- 5. RLS Policies for collaborators

-- Owners can manage collaborators for their docs
create policy "Owners can manage collaborators" on document_collaborators
for all
using (
  exists (
    select 1 from documents 
    where id = document_id 
    and user_id = auth.uid()
  )
);

-- Collaborators can view the collaboration entries for documents they are part of
create policy "Collaborators can view list" on document_collaborators
for select
using (
  user_email = auth.email()
);
