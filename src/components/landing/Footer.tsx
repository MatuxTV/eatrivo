"use client"

import Link from "next/link"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { usePathname } from "next/navigation"
import { getLocaleFromPathname } from "@/i18n/routing"

export function Footer() {
  const t = useTranslations("landing")
  const tCommon = useTranslations("common")
  const pathname = usePathname()
  const locale = getLocaleFromPathname(pathname)

  return (
    <footer className="bg-gray-900 text-white pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-1">
            <Link href={`/${locale}`} className="relative h-8 w-32 block mb-6">
              <Image
                src="/logo/LOGO_ROW.png"
                alt="EatRivo Logo"
                fill
                className="object-contain brightness-0 invert"
              />
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed">
              {t("footer.about")}
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 text-gray-200">{t("footer.product")}</h3>
            <ul className="space-y-3">
              <li><Link href="#how-it-works" className="text-gray-400 hover:text-white text-sm transition-colors">{t("navbar.howItWorks")}</Link></li>
              <li><Link href="#features" className="text-gray-400 hover:text-white text-sm transition-colors">{t("navbar.features")}</Link></li>
              <li><Link href={`/${locale}/signin`} className="text-gray-400 hover:text-white text-sm transition-colors">{t("footer.pricing")}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 text-gray-200">{t("footer.company")}</h3>
            <ul className="space-y-3">
              <li><Link href="#" className="text-gray-400 hover:text-white text-sm transition-colors">{t("footer.aboutUs")}</Link></li>
              <li><Link href="#" className="text-gray-400 hover:text-white text-sm transition-colors">{t("footer.blog")}</Link></li>
              <li><Link href="#" className="text-gray-400 hover:text-white text-sm transition-colors">{t("footer.contact")}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 text-gray-200">{t("footer.legal")}</h3>
            <ul className="space-y-3">
              <li><Link href="#" className="text-gray-400 hover:text-white text-sm transition-colors">{t("footer.terms")}</Link></li>
              <li><Link href="#" className="text-gray-400 hover:text-white text-sm transition-colors">{t("footer.privacy")}</Link></li>
              <li><Link href="#" className="text-gray-400 hover:text-white text-sm transition-colors">{t("footer.cookies")}</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm" suppressHydrationWarning>
            © {new Date().getFullYear()} {tCommon("appName")}. {t("footer.rights")}
          </p>
          <div className="flex gap-6">
            {/* Social Icons could go here */}
          </div>
        </div>
      </div>
    </footer>
  )
}
