import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignUpForm } from "./SignUpForm";

export default function SignUpPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(0,0,0,0.10),transparent_60%)]" />
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Create account</CardTitle>
            <CardDescription>
              Start by creating a brand project from your website URL.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <SignUpForm />
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link className="font-medium text-foreground hover:underline" href="/auth/sign-in">
                Sign in
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

