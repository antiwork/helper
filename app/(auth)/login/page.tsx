import { LoginForm } from "@/app/(auth)/login/loginForm";
import { TRPCReactProvider } from "@/trpc/react";

export default function Page() {
  return (
    <TRPCReactProvider>
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </div>
    </TRPCReactProvider>
  );
}
