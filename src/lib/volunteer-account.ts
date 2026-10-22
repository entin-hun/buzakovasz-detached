import { supabase } from "@/integrations/supabase/client";

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}

export async function saveRecoveryPassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function saveVolunteerProfile(userId: string, values: {
  vezeteknev: string; keresztnev: string; telefonszam: string;
}) {
  const { data, error } = await supabase.from("profiles").update({
    vezeteknev: values.vezeteknev.trim(),
    keresztnev: values.keresztnev.trim(),
    telefonszam: values.telefonszam.trim(),
  }).eq("user_id", userId).select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("A profil mentése nem sikerült. Kérjük, jelentkezz be újra.");
}

export async function cancelVolunteerCommitment(userId: string, commitmentId: string) {
  const { data, error } = await supabase.from("rescue_commitments")
    .update({ aktiv: false }).eq("id", commitmentId).eq("user_id", userId).select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("A vállalás lemondása nem sikerült. Kérjük, frissítsd az oldalt.");
}