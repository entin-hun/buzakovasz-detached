
-- Fix profiles RLS: change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Profiles are publicly viewable" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Profiles are publicly viewable"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Fix rescue_commitments RLS: change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Commitments are publicly viewable" ON public.rescue_commitments;
DROP POLICY IF EXISTS "Authenticated users can insert commitments" ON public.rescue_commitments;
DROP POLICY IF EXISTS "Users can update their own commitments" ON public.rescue_commitments;
DROP POLICY IF EXISTS "Users can delete their own commitments" ON public.rescue_commitments;

CREATE POLICY "Commitments are publicly viewable"
ON public.rescue_commitments FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert commitments"
ON public.rescue_commitments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own commitments"
ON public.rescue_commitments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own commitments"
ON public.rescue_commitments FOR DELETE
USING (auth.uid() = user_id);

-- Create rescue_history table for weekly archives
CREATE TABLE public.rescue_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  store_id uuid NOT NULL REFERENCES public.stores(id),
  het_datuma date NOT NULL,
  tipus text NOT NULL,
  megmentett_kg numeric(6,2) DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rescue_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "History is publicly viewable"
ON public.rescue_history FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own history"
ON public.rescue_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own history"
ON public.rescue_history FOR UPDATE
USING (auth.uid() = user_id);

-- Enable realtime for rescue_history
ALTER PUBLICATION supabase_realtime ADD TABLE public.rescue_history;
