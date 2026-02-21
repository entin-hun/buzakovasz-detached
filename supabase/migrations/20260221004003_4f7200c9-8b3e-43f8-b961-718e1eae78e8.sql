
-- Fix ALL RLS policies to PERMISSIVE
-- PROFILES
DROP POLICY IF EXISTS "Profiles are publicly viewable" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Profiles are publicly viewable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- RESCUE_COMMITMENTS
DROP POLICY IF EXISTS "Commitments are publicly viewable" ON public.rescue_commitments;
DROP POLICY IF EXISTS "Authenticated users can insert commitments" ON public.rescue_commitments;
DROP POLICY IF EXISTS "Users can update their own commitments" ON public.rescue_commitments;
DROP POLICY IF EXISTS "Users can delete their own commitments" ON public.rescue_commitments;
CREATE POLICY "Commitments are publicly viewable" ON public.rescue_commitments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert commitments" ON public.rescue_commitments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own commitments" ON public.rescue_commitments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own commitments" ON public.rescue_commitments FOR DELETE USING (auth.uid() = user_id);

-- RESCUE_HISTORY
DROP POLICY IF EXISTS "History is publicly viewable" ON public.rescue_history;
DROP POLICY IF EXISTS "Users can insert their own history" ON public.rescue_history;
DROP POLICY IF EXISTS "Users can update their own history" ON public.rescue_history;
CREATE POLICY "History is publicly viewable" ON public.rescue_history FOR SELECT USING (true);
CREATE POLICY "Users can insert their own history" ON public.rescue_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own history" ON public.rescue_history FOR UPDATE USING (auth.uid() = user_id);

-- STORES
DROP POLICY IF EXISTS "Stores are publicly viewable" ON public.stores;
CREATE POLICY "Stores are publicly viewable" ON public.stores FOR SELECT USING (true);

-- Add image_url column to rescue_history
ALTER TABLE public.rescue_history ADD COLUMN IF NOT EXISTS image_url text;

-- Create storage bucket for rescue photos
INSERT INTO storage.buckets (id, name, public) VALUES ('rescue-photos', 'rescue-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Rescue photos are publicly viewable" ON storage.objects FOR SELECT USING (bucket_id = 'rescue-photos');
CREATE POLICY "Authenticated users can upload rescue photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'rescue-photos' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update their own rescue photos" ON storage.objects FOR UPDATE USING (bucket_id = 'rescue-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Delete Petőfi utca store
DELETE FROM public.rescue_commitments WHERE store_id = 'a20de577-a9f4-47a9-9172-fbcb7ffa85e7';
DELETE FROM public.stores WHERE id = 'a20de577-a9f4-47a9-9172-fbcb7ffa85e7';
