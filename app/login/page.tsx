import { redirect } from "next/navigation";
import { LoginForm } from "@/app/login/LoginForm";
import { getCurrentUser } from "@/lib/server-auth";

const LOGIN_ERRORS: Record<string, string> = {
  invalid: "The email/User ID or password is incorrect.",
  "account-not-found": "No application account is linked to this Supabase user.",
  "account-disabled": "This account is disabled. Contact your administrator.",
  unavailable: "Unable to sign in right now. Check your connection and try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  if ("identifier" in params || "password" in params) {
    redirect("/login");
  }

  const user = await getCurrentUser().catch(() => null);
  if (user) {
    redirect(user.role === "manager" ? "/manager/dashboard" : "/employee/dashboard");
  }

  const authError = typeof params.authError === "string" ? params.authError : undefined;
  return <LoginForm initialError={authError ? LOGIN_ERRORS[authError] ?? "" : ""} />;
}