import { redirect } from "next/navigation";
import { defaultLocale } from "@/i18n/routing";

export default function NotAuthorizedWrapper() {
  redirect(`/${defaultLocale}/not-authorized`);
}
