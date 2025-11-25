"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-white/80 backdrop-blur-md border-b border-gray-200 py-3"
          : "bg-transparent py-5"
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 flex items-center justify-between">
        <Link href="/" className="relative h-8 w-32 sm:h-10 sm:w-40">
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
          <Link href="#how-it-works" className="text-sm font-medium text-gray-600 hover:text-eatrivo-purple transition-colors">
            Ako to funguje
          </Link>
          <Link href="#features" className="text-sm font-medium text-gray-600 hover:text-eatrivo-purple transition-colors">
            Funkcie
          </Link>
          <Link href="/signin">
            <Button  className="font-medium bg-eatrivo-light border-2  border-eatrivo-purple text-eatrivo-purple hover:bg-eatrivo-purple hover:text-white rounded-full px-6">
              Prihlásiť sa
            </Button>
          </Link>
          <Link href="/signin">
            <Button className="bg-eatrivo-purple hover:bg-eatrivo-purple/90 text-white rounded-full px-6">
              Začať zadarmo
            </Button>
          </Link>
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
                Ako to funguje
              </Link>
              <Link 
                href="#features" 
                className="text-base font-medium text-gray-900 py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Funkcie
              </Link>
              <div className="pt-4 flex flex-col gap-3">
                <Link href="/signin" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full justify-center rounded-full">
                    Prihlásiť sa
                  </Button>
                </Link>
                <Link href="/signin" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button className="w-full justify-center bg-eatrivo-purple hover:bg-eatrivo-purple/90 text-white rounded-full">
                    Začať zadarmo
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
