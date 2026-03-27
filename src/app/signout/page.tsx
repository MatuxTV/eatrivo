import { signOut } from "../../../auth";
import Link from "next/link";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut } from "lucide-react";
import { isLocale, type Locale } from "@/i18n/routing";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const safeLocale: Locale = isLocale(locale) ? locale : "sk";

  const t = await getTranslations({ locale: safeLocale, namespace: "auth" });
  return { title: t("signOut.metaTitle") };
}

export default async function SignOutPage() {
  const locale = await getLocale();
  const safeLocale: Locale = isLocale(locale) ? locale : "sk";
  const t = await getTranslations({ locale: safeLocale, namespace: "auth" });

  return (
    <div className="min-h-screen flex items-center justify-center bg-eatrivo-white-primary px-4 text-primary-text">
      <div className="w-full max-w-md">
        <Card className=" bg-eatrivo-white-primary text-eatrivo-black-primary/90">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <LogOut className="w-6 h-6 text-eatrivo-red" />
            </div>
            <CardTitle>{t("signOut.title")}</CardTitle>
            <CardDescription>{t("signOut.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: `/${safeLocale}/signin` });
              }}
              className="space-y-3"
            >
              <Button
                type="submit"
                className="w-full bg-eatrivo-red hover:scale-105 hover:bg-eatrivo-red/60"
                size="lg"
              >
                {t("signOut.confirm")}
              </Button>
            </form>
            <Link href="/home">
              <Button
                className="w-full text-eatrivo-black-secondary bg-eatrivo-white-secondary border-1 border-eatrivo-black/50 hover:scale-105 hover:bg-gray-100"
                size="lg"
              >
                {t("signOut.cancel")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
