import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.auth.forgot.metaTitle };
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
