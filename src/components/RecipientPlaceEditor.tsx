import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { MapPin, Search, Save } from 'lucide-react';
type Place = { id:string; nev:string; cim:string; telefon?:string|null; lat:number|null; lng:number|null; tipus:string };
type Match = {label:string;lat:number;lng:number};
export default function RecipientPlaceEditor({place,onClose,onSaved}:{place:Place|null;onClose:()=>void;onSaved:()=>void}) {
  const {toast} = useToast();
  const [name,setName] = useState(place?.nev ?? '');
  const [address,setAddress] = useState(place?.cim ?? '');
  const [phone,setPhone] = useState(place?.telefon ?? '');
  const [matches,setMatches] = useState<Match[]>([]);
  const [selected,setSelected] = useState<Match|null>(place?.lat != null && place?.lng != null ? {label:place.cim,lat:place.lat,lng:place.lng} : null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const search = async () => {
    setBusy(true);setError('');setSelected(null);
    const {data,error:failure} = await supabase.functions.invoke('recipient-geocode',{body:{address}});
    if(failure || data?.error) setError(data?.error ?? 'A címkeresés nem sikerült.');
    else {setMatches(data.matches ?? []);if(!data.matches?.length) setError('Nem található ez a cím. Add meg az irányítószámot, települést és házszámot is.');}
    setBusy(false);
  };
  const save = async (e:React.FormEvent) => {
    e.preventDefault(); if(!selected) return;
    setBusy(true);setError('');
    const payload = {nev:name.trim(),cim:address.trim(),telefon:phone.trim(),lat:selected.lat,lng:selected.lng,tipus:place?.tipus ?? 'befogadohely'};
    const query = place ? supabase.from('stores').update(payload).eq('id',place.id).select('id') : supabase.from('stores').insert(payload).select('id');
    const {data,error:failure} = await query;
    if(failure || !data?.length) {setError('A hely mentése nem sikerült. Ellenőrizd, hogy be vagy-e jelentkezve.');setBusy(false);return;}
    toast({title:'Befogadóhely mentve',description:name});onSaved();onClose();
  };
  return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent className="max-w-lg w-[calc(100%-2rem)] max-h-[90dvh] overflow-y-auto rounded-lg"><DialogHeader><DialogTitle>{place?'Befogadóhely szerkesztése':'Új befogadóhely'}</DialogTitle><DialogDescription>{place?.nev ?? 'Pékáru-adományok fogadóhelye'}</DialogDescription></DialogHeader>
    <form onSubmit={save} className="space-y-4">
      <label className="block text-sm font-medium">Hely neve<input required maxLength={180} value={name} onChange={e=>setName(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2" /></label>
      <label className="block text-sm font-medium">Teljes cím<input required maxLength={250} value={address} onChange={e=>{setAddress(e.target.value);setSelected(null);setMatches([]);}} placeholder="Irányítószám, település, utca, házszám" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2" /></label>
      <label className="block text-sm font-medium">Telefonszám<input required type="tel" pattern="[+0-9 ()/-]{7,30}" value={phone} onChange={e=>setPhone(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2" /></label>
      <Button type="button" variant="outline" disabled={busy||address.trim().length<5} onClick={search}><Search />{busy?'Keresés…':'Cím keresése'}</Button>
      {matches.length>0&&<fieldset className="space-y-2"><legend className="text-sm font-semibold mb-2">Pontos helyszín</legend>{matches.map((m,i)=><label key={i} className="flex items-start gap-2 text-sm border border-border p-3 rounded-md"><input type="radio" name="location" checked={selected===m} onChange={()=>setSelected(m)} className="mt-1"/><span className="break-words min-w-0">{m.label}</span></label>)}</fieldset>}
      {selected&&<p className="text-sm text-primary flex gap-2"><MapPin className="shrink-0" size={16}/>{selected.label}</p>}
      {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Mégse</Button><Button type="submit" disabled={busy||!selected}><Save/>Mentés</Button></div>
    </form>
  </DialogContent></Dialog>;
}