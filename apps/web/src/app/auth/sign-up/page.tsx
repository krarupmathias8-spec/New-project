import Link from "next/link";

import { SignUpForm } from "./SignUpForm";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-zinc-900">Create account</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Start by creating a brand project from your website URL.
            </p>
          </div>

          <SignUpForm />

          <p className="mt-6 text-sm text-zinc-600">
            Already have an account?{" "}
            <Link className="font-medium text-zinc-900" href="/auth/sign-in">
              Sign in
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

