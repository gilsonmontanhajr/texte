-- 1. Enable INSERT policy for documents
-- Allow users to create documents if they are the user_id (Self)
create policy "Users can populate their own documents" on documents for insert
with check (
  auth.uid() = user_id
);

-- 2. Update SELECT policy to handle Project Inheritance
-- Allow if Owner OR if Collaborator on the *Project* (root doc)
drop policy if exists "Users can view own or shared documents" on documents;
create policy "Users can view own or shared documents" on documents for select 
using (
  auth.uid() = user_id 
  OR 
  auth.email() in (
    select user_email from document_collaborators 
    where document_id = id -- Direct share
    OR document_id = documents.project_id -- Project share (Inheritance)
  )
);

-- 3. Update UPDATE policy for Project Inheritance (optional, for editors)
drop policy if exists "Users can update own or shared documents" on documents;
create policy "Users can update own or shared documents" on documents for update
using (
  auth.uid() = user_id 
  OR 
  exists (
    select 1 from document_collaborators 
    where (document_id = id OR document_id = documents.project_id)
    and user_email = auth.email() 
    and role = 'edit'
  )
);

-- 4. Enable DELETE policy (Owners only)
create policy "Users can delete their own documents" on documents for delete
using (
  auth.uid() = user_id
);
