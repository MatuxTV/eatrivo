import Link from "next/link"
import Image from "next/image"

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-1">
            <Link href="/" className="relative h-8 w-32 block mb-6">
              <Image
                src="/logo/LOGO_ROW.png"
                alt="EatRivo Logo"
                fill
                className="object-contain brightness-0 invert"
              />
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed">
              Váš osobný AI asistent pre zdravé a efektívne stravovanie. 
              Šetríme váš čas aj peniaze.
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 text-gray-200">Produkt</h3>
            <ul className="space-y-3">
              <li><Link href="#how-it-works" className="text-gray-400 hover:text-white text-sm transition-colors">Ako to funguje</Link></li>
              <li><Link href="#features" className="text-gray-400 hover:text-white text-sm transition-colors">Funkcie</Link></li>
              <li><Link href="/signin" className="text-gray-400 hover:text-white text-sm transition-colors">Cenník</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 text-gray-200">Spoločnosť</h3>
            <ul className="space-y-3">
              <li><Link href="#" className="text-gray-400 hover:text-white text-sm transition-colors">O nás</Link></li>
              <li><Link href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Blog</Link></li>
              <li><Link href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Kontakt</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 text-gray-200">Právne</h3>
            <ul className="space-y-3">
              <li><Link href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Podmienky používania</Link></li>
              <li><Link href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Ochrana súkromia</Link></li>
              <li><Link href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Cookies</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} EatRivo. Všetky práva vyhradené.
          </p>
          <div className="flex gap-6">
            {/* Social Icons could go here */}
          </div>
        </div>
      </div>
    </footer>
  )
}
