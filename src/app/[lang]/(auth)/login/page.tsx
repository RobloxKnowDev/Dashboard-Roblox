import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm, LoginFormFallback } from "@/features/auth/login-form";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.auth.login.metaTitle };
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginForm />
    </Suspense>
  );
}
