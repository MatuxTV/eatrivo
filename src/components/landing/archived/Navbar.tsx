"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Sparkles } from "lucide-react";
import { SK as SkFlag } from "country-flag-icons/react/3x2";
import { GB as GbFlag } from "country-flag-icons/react/3x2";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import {
  getLocaleFromPathname,
  isLocale,
  replaceLocaleInPathname,
} from "@/i18n/routing";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const t = useTranslations("landing");

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = getLocaleFromPathname(pathname);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-[background-color,padding,border-color] duration-300",
        isScrolled || isMobileMenuOpen
          ? "bg-white border-b border-gray-200 py-3"
          : "bg-transparent py-5",
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 flex items-center justify-between">
        <Link href={`/${locale}`} className="relative h-8 w-32 sm:h-10 sm:w-40">
          <Image
            src="/logo/LOGO_ROW.png"
            alt="EatRivo Logo"
            fill
            className="object-contain"
            priority
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <Link
            href="#how-it-works"
            className="text-sm font-medium text-gray-600 hover:text-eatrivo-purple transition-colors"
          >
            {t("navbar.howItWorks")}
          </Link>
          <Link
            href="#features"
            className="text-sm font-medium text-gray-600 hover:text-eatrivo-purple transition-colors"
          >
            {t("navbar.features")}
          </Link>
          <Link
            href="#pricing"
            className="text-sm font-medium text-gray-600 hover:text-eatrivo-purple transition-colors"
          >
            {t("navbar.pricing")}
          </Link>

          {/* CTA Button */}
          <Link href={`/${locale}`}>
            <Button className="bg-eatrivo-purple hover:scale-[1.1] active:scale-[0.98] text-white font-semibold rounded-full px-6 py-2.5 h-auto inline-flex items-center pointer-coarse:cursor-pointer gap-2 transition-all duration-200">
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              {t("navbar.signIn")}
            </Button>
          </Link>

          <Select
            value={locale}
            onValueChange={(value) => {
              if (!isLocale(value)) return;
              const nextPathname = replaceLocaleInPathname(pathname, value);
              const queryString = searchParams.toString();
              const hash =
                typeof window !== "undefined" ? window.location.hash : "";
              router.push(
                `${nextPathname}${queryString ? `?${queryString}` : ""}${hash}`,
              );
            }}
          >
            <SelectTrigger
              size="sm"
              aria-label={t("navbar.language")}
              className="h-9 w-[4.5rem] rounded-full border-transparent bg-transparent px-2 shadow-none hover:bg-gray-100 focus:ring-eatrivo-purple/15"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sk">
                <div className="flex items-center gap-2">
                  <SkFlag className="w-5 h-4" />
                  <span>SK</span>
                </div>
              </SelectItem>
              <SelectItem value="en">
                <div className="flex items-center gap-2">
                  <GbFlag className="w-5 h-4" />
                  <span>EN</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 text-gray-600"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-gray-200 overflow-hidden"
          >
            <div className="px-4 py-6 space-y-4 flex flex-col">
              <Link
                href="#how-it-works"
                className="text-base font-medium text-gray-900 py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t("navbar.howItWorks")}
              </Link>
              <Link
                href="#features"
                className="text-base font-medium text-gray-900 py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t("navbar.features")}
              </Link>
              <Link
                href="#goals"
                className="text-base font-medium text-gray-900 py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t("navbar.pricing")}
              </Link>
              <div className="pt-4 flex flex-col gap-3">
                <Link
                  href={`/${locale}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Button className="w-full justify-center bg-gradient-to-r from-eatrivo-purple to-eatrivo-pink hover:shadow-lg text-white font-semibold rounded-full py-3 h-auto gap-2">
                    <Sparkles className="w-4 h-4" aria-hidden="true" />
                    {t("navbar.startFree")}
                  </Button>
                </Link>

                <div className="pt-2">
                  <Select
                    value={locale}
                    onValueChange={(value) => {
                      if (!isLocale(value)) return;
                      const nextPathname = replaceLocaleInPathname(
                        pathname,
                        value,
                      );
                      const queryString = searchParams.toString();
                      const hash =
                        typeof window !== "undefined"
                          ? window.location.hash
                          : "";
                      router.push(
                        `${nextPathname}${queryString ? `?${queryString}` : ""}${hash}`,
                      );
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <SelectTrigger
                      size="default"
                      aria-label={t("navbar.language")}
                      className="w-full rounded-full border-transparent bg-gray-50 shadow-none hover:bg-gray-100 focus:ring-eatrivo-purple/15"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sk">SK</SelectItem>
                      <SelectItem value="en">EN</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
