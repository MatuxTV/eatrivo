"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
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
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-white/90 backdrop-blur-xl border-b border-gray-200 py-3"
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
            href="#goals"
            className="text-sm font-medium text-gray-600 hover:text-eatrivo-purple transition-colors"
          >
            {t("navbar.pricing")}
          </Link>

          <Link href={`/${locale}/signin`}>
            <Button className="bg-eatrivo-purple hover:bg-eatrivo-purple/90 text-white rounded-full px-6">
              {t("navbar.startFree")}
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
              <SelectItem value="sk">SK</SelectItem>
              <SelectItem value="en">EN</SelectItem>
            </SelectContent>
          </Select>
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 text-gray-600"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
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
                  href={`/${locale}/signin`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Button className="w-full justify-center bg-eatrivo-purple hover:bg-eatrivo-purple/90 text-white rounded-full">
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
