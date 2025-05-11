import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { LoginForm } from "./loginForm";

export default async function LoginPage() {
  const { userId } = await auth();
  if (userId) return redirect("/mailboxes");

  return (
    <div className="flex h-dvh w-screen flex-col items-center justify-center gap-3 px-6">
      <LoginForm />
    </div>
  );
}
