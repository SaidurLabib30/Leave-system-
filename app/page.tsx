import { getCurrentUser } from "@/lib/server-auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  redirect(user.role === "manager" ? "/manager/dashboard" : "/employee/dashboard");
}
