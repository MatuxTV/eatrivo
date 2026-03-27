import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { auth } from "../../../auth";
import { isLocale } from "@/i18n/routing";

export default async function ChatWithRivoPage() {
  const locale = await getLocale();
  const safeLocale = isLocale(locale) ? locale : "sk";

  const session = await auth();
  if (!session?.user) {
    redirect(`/${safeLocale}/signin`);
  }

  redirect("/home?section=chatWithRivo");
}
