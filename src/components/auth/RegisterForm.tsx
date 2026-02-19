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

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { emailRedirectTo: window.location.origin },
    });

    if (error) {
      toast({ title: "Regisztrációs hiba", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").insert({
        user_id: data.user.id,
        vezeteknev: form.vezeteknev.trim(),
        keresztnev: form.keresztnev.trim(),
        telefonszam: form.telefonszam.trim(),
      });

      if (profileError) {
        toast({ title: "Profil hiba", description: "Profil létrehozása sikertelen.", variant: "destructive" });
      } else {
        await refreshProfile();
        toast({
          title: "Sikeres regisztráció! 🍞",
          description: "Ellenőrizd az e-mail fiókodat a megerősítéshez.",
        });
      }
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
