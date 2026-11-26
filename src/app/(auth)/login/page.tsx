import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm, LoginFormFallback } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginForm />
    </Suspense>
  );
}
