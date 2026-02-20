
-- Fix profiles RLS: drop RESTRICTIVE, create PERMISSIVE
DROP POLICY IF EXISTS "Profiles are publicly viewable" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Profiles are publicly viewable"
ON public.profiles FOR SELECT
TO public
USING (true);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Fix rescue_commitments RLS: drop RESTRICTIVE, create PERMISSIVE
DROP POLICY IF EXISTS "Commitments are publicly viewable" ON public.rescue_commitments;
DROP POLICY IF EXISTS "Authenticated users can insert commitments" ON public.rescue_commitments;
DROP POLICY IF EXISTS "Users can update their own commitments" ON public.rescue_commitments;
DROP POLICY IF EXISTS "Users can delete their own commitments" ON public.rescue_commitments;

CREATE POLICY "Commitments are publicly viewable"
ON public.rescue_commitments FOR SELECT
TO public
USING (true);

CREATE POLICY "Authenticated users can insert commitments"
ON public.rescue_commitments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own commitments"
ON public.rescue_commitments FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own commitments"
ON public.rescue_commitments FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
