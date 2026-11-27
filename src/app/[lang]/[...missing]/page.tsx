import { notFound } from "next/navigation";

/** Any address that matches no page: the localized 404 (app/[lang]/not-found.tsx). */
export default function MissingPage() {
  notFound();
}
