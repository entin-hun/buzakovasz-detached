import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { saveRecoveryPassword } from "@/lib/volunteer-account";
import NavBar from "@/components/NavBar";

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const recoveryLink = hash.get("type") === "recovery";
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
        setChecking(false);
      }
    });
    // getUser waits for the client to finish consuming the email-link session.
    supabase.auth.getUser().then(({ data, error: authError }) => {
      if (!authError && data.user && (recoveryLink || sessionStorage.getItem("volunteer-password-recovery") === "true")) setReady(true);
      setChecking(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmation) { setError("A két jelszó nem egyezik."); return; }
    setSaving(true);
    setError("");
    try {
      await saveRecoveryPassword(password);
      sessionStorage.removeItem("volunteer-password-recovery");
      await supabase.auth.signOut();
      setComplete(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "A jelszó mentése nem sikerült. Kérj új linket és próbáld újra.");
    } finally { setSaving(false); }
  };

  return <div className="min-h-screen bg-background"><NavBar /><main className="mx-auto max-w-md px-4 py-12">
    <h1 className="mb-6 text-2xl font-bold">Új jelszó megadása</h1>
    {checking ? <p role="status">A link ellenőrzése…</p> : complete ? <div className="space-y-4"><p role="status">A jelszavadat sikeresen megváltoztattuk. Jelentkezz be az új jelszóval!</p><Button asChild className="w-full"><Link to="/auth">Bejelentkezés</Link></Button></div> : !ready ? <div className="space-y-4"><p role="alert">A link érvénytelen vagy lejárt. Kérj új jelszóhelyreállító e-mailt.</p><Button asChild className="w-full"><Link to="/forgot-password">Új link kérése</Link></Button></div> : <form onSubmit={submit} className="space-y-4">
      <div><label htmlFor="new-password" className="block text-sm font-medium mb-1.5">Új jelszó</label><input id="new-password" type="password" autoComplete="new-password" minLength={6} required value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-ring" /></div>
      <div><label htmlFor="confirm-password" className="block text-sm font-medium mb-1.5">Új jelszó megerősítése</label><input id="confirm-password" type="password" autoComplete="new-password" minLength={6} required value={confirmation} onChange={e => setConfirmation(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-ring" /></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={saving} className="w-full">{saving ? "Mentés…" : "Új jelszó mentése"}</Button>
    </form>}
  </main></div>;
}