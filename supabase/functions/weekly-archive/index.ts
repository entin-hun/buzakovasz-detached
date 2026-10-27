import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
// Scheduled runs use SQL directly. Retain this legacy entrypoint only for trusted server calls.
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const respond = (body: unknown, status=200) => new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return respond({error:'Archiválás nem elérhető.'},503);
  if (req.headers.get('Authorization') !== `Bearer ${key}`) return respond({error:'Unauthorized'},401);
  const client = createClient(url,key);
  const {data,error} = await client.rpc('archive_rescues');
  if (error) return respond({error:'Archiválás nem sikerült.'},500);
  return respond({success:true,archived:data});
});
