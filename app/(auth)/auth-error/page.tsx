import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; error_code?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm text-center">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Sorry, something went wrong.</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{params?.error ?? "An unspecified error occurred."}</p>
            </CardContent>
          </Card>
          {params?.error_code === "signup_disabled" && (
            <Alert variant="bright" className="text-sm">
              Want to set up your own Helper?{" "}
              <Link href="/help" className="font-semibold underline-offset-4 hover:underline">
                Get started →
              </Link>
            </Alert>
          )}
          <Link href="/" className="text-sm underline-offset-4 hover:underline">
            Back to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
