"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { getLocaleFromPathname } from "@/i18n/routing";
import { reopenCookieConsent } from "@/components/CookieConsent";

export function Footer() {
  const t = useTranslations("landing");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);

  return (
    <footer className="bg-gray-900 text-white pt-16 pb-[max(2rem,env(safe-area-inset-bottom))]">
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
            <p className="text-gray-500 text-xs mt-3">
              {t("footer.companyInfo")}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 text-gray-200">
              {t("footer.product")}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="#how-it-works"
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  {t("navbar.howItWorks")}
                </Link>
              </li>
              <li>
                <Link
                  href="#features"
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  {t("navbar.features")}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/signin`}
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  {t("footer.pricing")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 text-gray-200">
              {t("footer.company")}
            </h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:info@valorixdigital.com"
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  {t("footer.contact")}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 text-gray-200">
              {t("footer.legal")}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href={`/${locale}/terms-of-service`}
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  {t("footer.terms")}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/privacy-policy`}
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  {t("footer.privacy")}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/cookie-policy`}
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  {t("footer.cookiePolicy")}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/medical-disclaimer`}
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  {t("footer.medicalDisclaimer")}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/terms-of-service#complaints`}
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  {t("footer.complaints")}
                </Link>
              </li>
              <li>
                <button
                  onClick={reopenCookieConsent}
                  className="text-gray-400 hover:text-white text-sm transition-colors text-left"
                >
                  {t("footer.cookieSettings")}
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* ODR Platform */}
        <div className="border-t border-gray-800 pt-6 pb-4">
          <p className="text-gray-500 text-xs leading-relaxed text-center">
            {t("footer.odrInfo")}{" "}
            <a
              href="https://ec.europa.eu/consumers/odr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white underline"
            >
              https://ec.europa.eu/consumers/odr
            </a>
          </p>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm" suppressHydrationWarning>
            © {new Date().getFullYear()} {tCommon("appName")}.{" "}
            {t("footer.rights")}
          </p>
          <div className="flex gap-6">
            <a
              href="https://www.instagram.com/nutrition_with_eatrivo/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Instagram"
            >
              <svg
                className="h-5 w-5"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
                  clipRule="evenodd"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
