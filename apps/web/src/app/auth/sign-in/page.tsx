import Link from "next/link";

import { env } from "@/lib/env";
import { SignInForm } from "./SignInForm";

export default function SignInPage() {
  const callbackUrl = "/dashboard";
  const showGoogle = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-zinc-900">Sign in</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Access your projects and generate new creatives.
            </p>
          </div>

          <SignInForm callbackUrl={callbackUrl} showGoogle={showGoogle} />

          <p className="mt-6 text-sm text-zinc-600">
            Don&apos;t have an account?{" "}
            <Link className="font-medium text-zinc-900" href="/auth/sign-up">
              Create one
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

