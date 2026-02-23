import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export default function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const { toast } = useToast();
  const { refreshProfile } = useAuth();
  const [form, setForm] = useState({
    vezeteknev: "",
    keresztnev: "",
    telefonszam: "",
    email: "",
    password: "",
    passwordConfirm: "",
  });
  const [loading, setLoading] = useState(false);
  const [showResendInfo, setShowResendInfo] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.passwordConfirm) {
      toast({ title: "Hiba", description: "A két jelszó nem egyezik.", variant: "destructive" });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: "Hiba", description: "A jelszónak legalább 6 karakter hosszúnak kell lennie.", variant: "destructive" });
      return;
    }
    setLoading(true);

    // Try to sign up
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { emailRedirectTo: window.location.origin },
    });

    if (error) {
      // If the user already exists, suggest login
      if (error.message.includes("already registered") || error.message.includes("already been registered")) {
        toast({
          title: "Ez az e-mail már regisztrálva van!",
          description: "Próbálj bejelentkezni a meglévő fiókoddal, és onnan folytathatod ahol tartottál.",
        });
        setShowResendInfo(true);
      } else {
        toast({ title: "Regisztrációs hiba", description: error.message, variant: "destructive" });
      }
      setLoading(false);
      return;
    }

    // Check if signup returned a user but identities is empty (means user already exists in some providers)
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      toast({
        title: "Ez az e-mail már regisztrálva van! 📧",
        description: "Jelentkezz be a meglévő fiókoddal, és onnan folytathatod ahol tartottál.",
      });
      setShowResendInfo(true);
      setLoading(false);
      return;
    }

    if (data.user) {
      // Try to create profile - use upsert to handle potential re-registration
      const { error: profileError } = await supabase.from("profiles").upsert({
        user_id: data.user.id,
        vezeteknev: form.vezeteknev.trim(),
        keresztnev: form.keresztnev.trim(),
        telefonszam: form.telefonszam.trim(),
      }, { onConflict: "user_id" });

      if (profileError) {
        console.error("Profile creation error:", profileError);
        // Don't block registration if profile fails - ProfileCompletionModal will catch it
      } else {
        await refreshProfile();
      }

      toast({
        title: "Sikeres regisztráció! 🍞",
        description: "Ellenőrizd az e-mail fiókodat a megerősítő linkért. Utána bejelentkezhetsz!",
      });
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {showResendInfo && (
        <div className="rounded-xl p-4 text-sm space-y-2" style={{ background: "hsl(var(--teal-light))", color: "hsl(var(--teal-dark))" }}>
          <p className="font-semibold">📧 Már van fiókod ezzel az e-mail címmel!</p>
          <p>Jelentkezz be az alábbi gombbal, és folytasd onnan ahol abbahagytad. Ha elfelejtetted a jelszavad, írj nekünk.</p>
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="btn-teal w-full text-sm py-2 mt-2"
          >
            Bejelentkezés →
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Vezetéknév</label>
          <input
            name="vezeteknev"
            required
            value={form.vezeteknev}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            placeholder="Kovács"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Keresztnév</label>
          <input
            name="keresztnev"
            required
            value={form.keresztnev}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            placeholder="Anna"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Telefonszám</label>
        <input
          name="telefonszam"
          required
          value={form.telefonszam}
          onChange={handleChange}
          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          placeholder="+36 20 123 4567"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">E-mail cím</label>
        <input
          name="email"
          type="email"
          required
          value={form.email}
          onChange={handleChange}
          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          placeholder="pelda@email.hu"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Jelszó</label>
        <input
          name="password"
          type="password"
          required
          value={form.password}
          onChange={handleChange}
          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          placeholder="Minimum 6 karakter"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Jelszó megerősítése</label>
        <input
          name="passwordConfirm"
          type="password"
          required
          value={form.passwordConfirm}
          onChange={handleChange}
          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          placeholder="••••••••"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="btn-teal w-full mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? "Regisztráció..." : "Regisztrálok"}
      </button>
      <p className="text-center text-sm text-muted-foreground pt-2">
        Már van fiókod?{" "}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-primary font-medium hover:underline"
        >
          Jelentkezz be!
        </button>
      </p>
    </form>
  );
}