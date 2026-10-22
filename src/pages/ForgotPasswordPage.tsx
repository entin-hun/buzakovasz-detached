import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import NavBar from "@/components/NavBar";

export default function ForgotPasswordPage() {
  return <div className="min-h-screen bg-background"><NavBar /><main className="mx-auto max-w-md px-4 py-12"><h1 className="mb-6 text-2xl font-bold">Elfelejtett jelszó</h1><ForgotPasswordForm /></main></div>;
}