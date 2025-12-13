import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { env } from "@/lib/env";
import { SignInForm } from "./SignInForm";

export default function SignInPage() {
  const callbackUrl = "/dashboard";
  const showGoogle = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(0,0,0,0.10),transparent_60%)]" />
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Access your projects and generate new creatives.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <SignInForm callbackUrl={callbackUrl} showGoogle={showGoogle} />
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link className="font-medium text-foreground hover:underline" href="/auth/sign-up">
                Create one
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

