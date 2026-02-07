-- Add hierarchy support
alter table documents 
add column if not exists parent_id uuid references documents(id) on delete cascade,
add column if not exists project_id uuid references documents(id) on delete cascade,
add column if not exists is_folder boolean default false;

-- Index for faster tree traversal
create index if not exists idx_documents_parent_id on documents(parent_id);
create index if not exists idx_documents_project_id on documents(project_id);

-- Update existing documents to be "Roots" (projects)
-- We set project_id = id for root documents so we can query "where project_id = X" to get the whole tree
update documents 
set project_id = id 
where parent_id is null and project_id is null;
