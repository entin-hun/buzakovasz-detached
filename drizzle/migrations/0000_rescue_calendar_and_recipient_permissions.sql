CREATE OR REPLACE FUNCTION public.rescue_day(friday date) RETURNS date LANGUAGE sql IMMUTABLE SET search_path=public AS $$ SELECT CASE friday WHEN DATE '2026-01-02' THEN DATE '2025-12-31' WHEN DATE '2026-04-03' THEN DATE '2026-04-02' WHEN DATE '2026-05-01' THEN DATE '2026-04-30' WHEN DATE '2026-08-21' THEN DATE '2026-08-19' WHEN DATE '2026-10-23' THEN DATE '2026-10-22' WHEN DATE '2026-12-25' THEN DATE '2026-12-23' WHEN DATE '2027-01-01' THEN DATE '2026-12-31' WHEN DATE '2027-03-26' THEN DATE '2027-03-25' WHEN DATE '2027-08-20' THEN DATE '2027-08-19' ELSE friday END $$;
GRANT EXECUTE ON FUNCTION public.rescue_day(date) TO anon,authenticated,service_role;
GRANT INSERT,UPDATE ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;
CREATE POLICY "Volunteers add recipient places" ON public.stores FOR INSERT TO authenticated WITH CHECK (tipus IN ('hajlektalan_szallo','kozossegi_huto','befogadohely') AND lat IS NOT NULL AND lng IS NOT NULL AND length(trim(nev))>0 AND length(trim(cim))>0 AND length(trim(telefon))>0);
CREATE POLICY "Volunteers edit recipient places" ON public.stores FOR UPDATE TO authenticated USING (tipus IN ('hajlektalan_szallo','kozossegi_huto','befogadohely')) WITH CHECK (tipus IN ('hajlektalan_szallo','kozossegi_huto','befogadohely') AND lat IS NOT NULL AND lng IS NOT NULL AND length(trim(nev))>0 AND length(trim(cim))>0 AND length(trim(telefon))>0);
CREATE OR REPLACE FUNCTION public.validate_rescue_booking() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE local_now timestamp := now() AT TIME ZONE 'Europe/Budapest'; target date;
BEGIN
IF TG_OP='UPDATE' AND NEW.aktiv=false THEN RETURN NEW; END IF;
IF NEW.tipus='egyszeri' AND NEW.aktiv THEN
IF NEW.datum IS NULL THEN RAISE EXCEPTION 'Válassz mentési napot.'; END IF;
IF NOT EXISTS (SELECT 1 FROM generate_series(0,6) AS n WHERE extract(isodow FROM NEW.datum+n)=5 AND public.rescue_day(NEW.datum+n)=NEW.datum) THEN RAISE EXCEPTION 'Csak hivatalos mentési napra lehet jelentkezni.'; END IF;
target := NEW.datum;
IF local_now >= target + time '18:00' THEN RAISE EXCEPTION 'Erre a mentésre már lezárult a jelentkezés (18:00).'; END IF;
END IF;
RETURN NEW;
END $$;
CREATE TRIGGER validate_rescue_booking BEFORE INSERT OR UPDATE OF datum, aktiv ON public.rescue_commitments FOR EACH ROW EXECUTE FUNCTION public.validate_rescue_booking();