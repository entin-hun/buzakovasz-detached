import { useEffect, useState } from "react";
import { Pencil, Save, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { saveVolunteerProfile } from "@/lib/volunteer-account";
import { useToast } from "@/hooks/use-toast";

export default function VolunteerAccountDetails() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ vezeteknev: "", keresztnev: "", telefonszam: "" });
  useEffect(() => {
    if (profile) setForm({ vezeteknev: profile.vezeteknev, keresztnev: profile.keresztnev, telefonszam: profile.telefonszam });
  }, [profile, editing]);
  if (!user || !profile) return null;
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (Object.values(form).some(value => !value.trim())) { setError("Kérjük, töltsd ki az összes mezőt."); return; }
    setSaving(true);
    setError("");
    try {
      await saveVolunteerProfile(user.id, form);
      await refreshProfile();
      setEditing(false);
      toast({ title: "Profiladatok mentve" });
    } catch (err) { setError(err instanceof Error ? err.message : "A mentés nem sikerült."); }
    finally { setSaving(false); }
  };
  return <section className="border-b border-border pb-5">
    <div className="flex items-center justify-between gap-3 mb-3"><h4 className="font-bold text-sm">Profiladatok</h4>{!editing && <Button variant="outline" size="sm" onClick={() => { setError(""); setEditing(true); }}><Pencil />Szerkesztés</Button>}</div>
    {editing ? <form onSubmit={save} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{([['vezeteknev', 'Vezetéknév'], ['keresztnev', 'Keresztnév'], ['telefonszam', 'Telefonszám']] as const).map(([key, label]) => <div key={key} className={key === 'telefonszam' ? 'sm:col-span-2' : ''}><label htmlFor={`profile-${key}`} className="block text-sm mb-1">{label}</label><input id={`profile-${key}`} type={key === 'telefonszam' ? 'tel' : 'text'} autoComplete={key === 'telefonszam' ? 'tel' : key === 'vezeteknev' ? 'family-name' : 'given-name'} required value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} className="w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>)}</div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2"><Button type="submit" disabled={saving}><Save />{saving ? "Mentés…" : "Adatok mentése"}</Button><Button variant="ghost" disabled={saving} onClick={() => setEditing(false)} type="button"><X />Mégse</Button></div>
    </form> : <div className="text-sm space-y-1"><p className="break-words">{profile.vezeteknev} {profile.keresztnev}</p><a className="text-primary break-all" href={`tel:${profile.telefonszam}`}>{profile.telefonszam}</a></div>}
  </section>;
}