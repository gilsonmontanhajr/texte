-- Setup Storage for Images

-- Create 'images' bucket
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

-- Enable RLS (standard for storage.objects)
alter table storage.objects enable row level security;

-- Policy: Allow public access to view images
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'images' );

-- Policy: Allow authenticated users to upload images
create policy "Authenticated users can upload images"
  on storage.objects for insert
  with check (
    bucket_id = 'images' 
    and auth.role() = 'authenticated'
  );

-- Policy: Allow users to update their own images (optional but good)
create policy "Users can update own images"
  on storage.objects for update
  using (
    bucket_id = 'images'
    and auth.uid() = owner
  );

-- Policy: Allow users to delete their own images
create policy "Users can delete own images"
  on storage.objects for delete
  using (
    bucket_id = 'images'
    and auth.uid() = owner
  );
