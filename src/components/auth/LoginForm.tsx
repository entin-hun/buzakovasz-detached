import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

export default function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Hiba", description: "Hibás e-mail vagy jelszó.", variant: "destructive" });
    } else {
      toast({ title: "Sikeres bejelentkezés!", description: "Üdvözlünk az önkéntes csapatban! 🍞" });
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">E-mail cím</label>
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          placeholder="pelda@email.hu"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Jelszó</label>
        <input
          type="password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          placeholder="••••••••"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="btn-teal w-full mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? "Bejelentkezés..." : "Bejelentkezés"}
      </button>
      <p className="text-center text-sm text-muted-foreground pt-2">
        Még nincs fiókod?{" "}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-primary font-medium hover:underline"
        >
          Regisztrálj!
        </button>
      </p>
    </form>
  );
}
