import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestPasswordReset } from "@/lib/volunteer-account";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);
    setError("");
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch {
      setError("A link küldése nem sikerült. Kérjük, próbáld újra néhány perc múlva.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      {sent ? (
        <div role="status" className="space-y-3 text-sm text-foreground">
          <Mail className="mx-auto h-8 w-8 text-primary" />
          <p>Ha ehhez az e-mail címhez tartozik fiók, elküldtük a jelszóhelyreállító linket. Nézd meg a beérkező leveleket és a spam mappát is.</p>
          <p className="text-muted-foreground">A levélben található linkkel új jelszót adhatsz meg.</p>
          <Button variant="outline" className="w-full" onClick={() => setSent(false)}>Új link kérése</Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-muted-foreground">Add meg a regisztrációkor használt e-mail címedet, és küldünk egy linket az új jelszó megadásához.</p>
          <div>
            <label htmlFor="reset-email" className="block text-sm font-medium mb-1.5">E-mail cím</label>
            <input id="reset-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={sending} className="w-full"><Mail />{sending ? "Küldés…" : "Jelszóhelyreállító link küldése"}</Button>
        </form>
      )}
      <Button asChild variant="link" className="w-full"><Link to="/auth"><ArrowLeft />Vissza a bejelentkezéshez</Link></Button>
    </div>
  );
}