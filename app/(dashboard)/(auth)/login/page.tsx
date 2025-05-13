"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { Provider } from "@supabase/supabase-js";
import { useTheme } from "next-themes";
import Image from "next/image";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export default function LoginPage() {
  const { theme, systemTheme } = useTheme();

  return (
    <div className="flex h-dvh w-screen flex-col items-center justify-center gap-3 px-6">
      <div className="w-full max-w-md [&_a[href='#auth-sign-up']]:hidden!">
        <div className="mb-8 flex flex-col items-center gap-4">
          <Image
            src={theme === "dark" || systemTheme === "dark" ? "/logo-white.svg" : "/logo.svg"}
            alt="Helper"
            width="110"
            height="32"
            className="w-28"
          />
          <p className="text-sm text-muted-foreground">Please sign in to continue</p>
        </div>

        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: "var(--bright)",
                  brandAccent: "var(--bright)",
                  brandButtonText: "var(--bright-foreground)",
                  defaultButtonBackground: "var(--muted)",
                  defaultButtonBackgroundHover: "color-mix(in srgb, var(--muted) 90%, white)",
                  defaultButtonBorder: "transparent",
                  defaultButtonText: "var(--foreground)",
                  dividerBackground: "var(--border)",
                  inputBackground: "var(--background)",
                  inputBorder: "var(--input)",
                  inputBorderFocus: "var(--input)",
                  inputBorderHover: "var(--input)",
                  inputLabelText: "var(--muted-foreground)",
                  inputPlaceholder: "var(--muted-foreground)",
                  inputText: "var(--foreground)",
                  messageText: "var(--foreground)",
                  messageBackground: "var(--background)",
                  messageBorder: "var(--border)",
                  messageTextDanger: "var(--destructive-foreground)",
                  messageBackgroundDanger: "var(--destructive)",
                  messageBorderDanger: "var(--destructive)",
                  anchorTextColor: "var(--muted-foreground)",
                  anchorTextHoverColor: "var(--foreground)",
                },
                fonts: {
                  bodyFontFamily: "var(--font-sundry-regular)",
                  buttonFontFamily: "var(--font-sundry-regular)",
                  inputFontFamily: "var(--font-sundry-regular)",
                  labelFontFamily: "var(--font-sundry-regular)",
                },
              },
            },
          }}
          providers={env.NEXT_PUBLIC_SUPABASE_AUTH_OPTIONS.filter((provider) => provider !== "password") as Provider[]}
          onlyThirdPartyProviders={env.NEXT_PUBLIC_SUPABASE_AUTH_OPTIONS.includes("password")}
        />
      </div>
    </div>
  );
}
