CREATE OR REPLACE FUNCTION public.validate_rescue_booking() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE local_now timestamp := now() AT TIME ZONE 'Europe/Budapest';
BEGIN
IF auth.uid() IS NULL THEN RETURN NEW; END IF;
IF TG_OP='UPDATE' AND NEW.aktiv=false THEN RETURN NEW; END IF;
IF NEW.tipus='egyszeri' AND NEW.aktiv THEN
IF NEW.datum IS NULL THEN RAISE EXCEPTION 'Válassz mentési napot.'; END IF;
IF NOT EXISTS (SELECT 1 FROM generate_series(0,6) AS n WHERE extract(isodow FROM NEW.datum+n)=5 AND public.rescue_day(NEW.datum+n)=NEW.datum) THEN RAISE EXCEPTION 'Csak hivatalos mentési napra lehet jelentkezni.'; END IF;
IF local_now >= NEW.datum + time '18:00' THEN RAISE EXCEPTION 'Erre a mentésre már lezárult a jelentkezés (18:00).'; END IF;
END IF; RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION public.archive_rescues() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE local_now timestamp := now() AT TIME ZONE 'Europe/Budapest'; friday date; actual date; inserted integer;
BEGIN
PERFORM pg_advisory_xact_lock(723842);
friday := local_now::date + (5-extract(isodow FROM local_now)::int);
actual := public.rescue_day(friday);
IF local_now < actual + time '20:00' THEN RETURN 0; END IF;
INSERT INTO public.rescue_history(user_id,store_id,het_datuma,tipus)
SELECT c.user_id,c.store_id,CASE WHEN c.tipus='allandó' THEN actual ELSE public.rescue_day(c.datum) END,c.tipus
FROM public.rescue_commitments c
WHERE c.aktiv AND ((c.tipus='allandó' AND (c.created_at AT TIME ZONE 'Europe/Budapest') < actual + time '18:00') OR (c.tipus='egyszeri' AND public.rescue_day(c.datum)<=actual))
AND NOT EXISTS(SELECT 1 FROM public.rescue_history h WHERE h.user_id=c.user_id AND h.store_id=c.store_id AND h.het_datuma=CASE WHEN c.tipus='allandó' THEN actual ELSE public.rescue_day(c.datum) END);
GET DIAGNOSTICS inserted=ROW_COUNT;
UPDATE public.rescue_commitments SET aktiv=false WHERE aktiv AND tipus='egyszeri' AND public.rescue_day(datum)<=actual;
RETURN inserted;
END $$;
REVOKE ALL ON FUNCTION public.archive_rescues() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.archive_rescues() TO service_role;