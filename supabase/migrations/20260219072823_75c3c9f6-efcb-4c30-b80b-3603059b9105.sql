
-- Profiles table for volunteers
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  vezeteknev TEXT NOT NULL,
  keresztnev TEXT NOT NULL,
  telefonszam TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are publicly viewable"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Stores table
CREATE TABLE public.stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nev TEXT NOT NULL,
  cim TEXT NOT NULL,
  kerület TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stores are publicly viewable"
  ON public.stores FOR SELECT USING (true);

-- Rescue commitments table
CREATE TABLE public.rescue_commitments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  tipus TEXT NOT NULL CHECK (tipus IN ('allandó', 'egyszeri')),
  datum DATE, -- only for egyszeri (specific date), NULL means állandó
  aktiv BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.rescue_commitments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Commitments are publicly viewable"
  ON public.rescue_commitments FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert commitments"
  ON public.rescue_commitments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own commitments"
  ON public.rescue_commitments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own commitments"
  ON public.rescue_commitments FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_commitments_updated_at
  BEFORE UPDATE ON public.rescue_commitments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for rescue_commitments
ALTER PUBLICATION supabase_realtime ADD TABLE public.rescue_commitments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
