import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
const schema = z.object({ address: z.string().trim().min(5).max(250) });
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), {status, headers: {...corsHeaders, 'Content-Type':'application/json'}});
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_ANON_KEY');
    if (!url || !key) return respond({error:'A címkereső nem elérhető.'},503);
    const client = createClient(url,key);
    const token = req.headers.get('Authorization')?.replace(/^Bearer /,'');
    if (!token) return respond({error:'Jelentkezz be a címkereséshez.'},401);
    const {data, error} = await client.auth.getUser(token);
    if (error || !data.user) return respond({error:'Jelentkezz be újra.'},401);
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return respond({error:'Adj meg egy teljes címet.'},400);
    const params = new URLSearchParams({q:parsed.data.address,format:'jsonv2',countrycodes:'hu',limit:'5',addressdetails:'1'});
    const result = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {headers:{'User-Agent':'BuzakovaszRescue/1.0 (https://buzakovasz.lovable.app)', 'Accept-Language':'hu'}, signal:AbortSignal.timeout(12000)});
    if (!result.ok) {
      const fallback = await fetch(`https://photon.komoot.io/api/?${new URLSearchParams({q:parsed.data.address,limit:'5',lat:'47.4979',lon:'19.0402'})}`, {signal:AbortSignal.timeout(12000)});
      if (!fallback.ok) return respond({error:'A címkereső átmenetileg nem elérhető. Próbáld később.'},503);
      const json = await fallback.json();
      const features = (json.features ?? []).filter((f: {properties: {countrycode?:string}}) => f.properties.countrycode === 'HU');
      return respond({matches:features.map((f: {properties: Record<string,string>;geometry:{coordinates:number[]}}) => ({label:[f.properties.name,f.properties.street,f.properties.housenumber,f.properties.postcode,f.properties.city].filter(Boolean).join(', '),lat:f.geometry.coordinates[1],lng:f.geometry.coordinates[0]}))});
    }
    const matches = await result.json();
    return respond({matches:matches.map((m: {display_name:string;lat:string;lon:string}) => ({label:m.display_name,lat:Number(m.lat),lng:Number(m.lon)}))});
  } catch { return respond({error:'A címkeresés nem sikerült. Próbáld később.'},500); }
});