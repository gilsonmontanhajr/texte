-- Add 'is_public' to documents
alter table documents add column if not exists is_public boolean default false;

-- Form Submissions Table
create table if not exists form_submissions (
  id uuid default gen_random_uuid() primary key,
  document_id uuid references documents(id) on delete cascade not null,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table form_submissions enable row level security;

-- Policies for documents (Public Access)
-- Need to drop existing policy if it conflicts or just add a new one.
-- Existing: "Users can view documents they own or collaborate on".
-- We need to ADD: "Public can view public documents".

create policy "Public can view public documents"
  on documents for select
  using ( is_public = true );

-- Policies for form_submissions
-- Public (anyone) can insert a submission if the document is public
create policy "Anyone can submit to public forms"
  on form_submissions for insert
  with check (
    exists (
      select 1 from documents
      where id = form_submissions.document_id
      and is_public = true
    )
  );

-- Only owners/collaborators can view submissions
create policy "Owners and collaborators can view submissions"
  on form_submissions for select
  using (
    exists (
      select 1 from documents
      where id = form_submissions.document_id
      and (
        user_id = auth.uid() OR
        exists (
          select 1 from document_collaborators
          where document_id = documents.id
          and user_email = (select auth.jwt() ->> 'email')
        )
      )
    )
  );
