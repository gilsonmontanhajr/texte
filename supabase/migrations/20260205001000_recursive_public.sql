-- Recursive function to set is_public
create or replace function set_document_public_recursive(doc_id uuid, is_public_val boolean)
returns void
language plpgsql
security definer
as $$
begin
  with recursive descendants as (
    -- Base case: the document itself
    select id from documents where id = doc_id
    union all
    -- Recursive step: children of documents in the CTE
    select d.id
    from documents d
    inner join descendants parent on d.parent_id = parent.id
  )
  update documents
  set is_public = is_public_val
  where id in (select id from descendants);
end;
$$;
