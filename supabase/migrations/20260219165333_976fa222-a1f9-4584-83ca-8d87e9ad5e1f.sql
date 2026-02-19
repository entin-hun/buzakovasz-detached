
-- Fix RLS policies: change all RESTRICTIVE to PERMISSIVE on rescue_commitments
DROP POLICY IF EXISTS "Authenticated users can insert commitments" ON public.rescue_commitments;
DROP POLICY IF EXISTS "Commitments are publicly viewable" ON public.rescue_commitments;
DROP POLICY IF EXISTS "Users can delete their own commitments" ON public.rescue_commitments;
DROP POLICY IF EXISTS "Users can update their own commitments" ON public.rescue_commitments;

DROP POLICY IF EXISTS "Profiles are publicly viewable" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Stores are publicly viewable" ON public.stores;

-- Re-create as PERMISSIVE (default)
CREATE POLICY "Commitments are publicly viewable"
  ON public.rescue_commitments FOR SELECT
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

-- Profiles
CREATE POLICY "Profiles are publicly viewable"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Stores
CREATE POLICY "Stores are publicly viewable"
  ON public.stores FOR SELECT
  USING (true);

-- Add coordinates columns for map
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS telefon text,
  ADD COLUMN IF NOT EXISTS email text;

-- Add drop-off point type column (bakery vs shelter vs community_fridge)
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS tipus text NOT NULL DEFAULT 'pekseg';
