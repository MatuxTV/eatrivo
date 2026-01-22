import { WifiOff } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-eatrivo-light to-white p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-24 h-24 mx-auto bg-eatrivo-purple/10 rounded-full flex items-center justify-center">
          <WifiOff className="w-12 h-12 text-eatrivo-purple" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-eatrivo-black-primary">
            Ste offline
          </h1>
          <p className="text-gray-600">
            Zdá sa, že nemáte pripojenie k internetu. Niektoré funkcie môžu byť obmedzené.
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <h2 className="font-semibold text-lg mb-3 text-eatrivo-black-primary">
            Čo môžete robiť offline:
          </h2>
          <ul className="text-sm text-gray-600 space-y-2 text-left">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>Prezerať si váš najnovší nákupný zoznam</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>Zobraziť uložené dáta z predchádzajúcej návštevy</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-1">✗</span>
              <span>Generovať nové meal plány alebo nákupné zoznamy</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => window.location.reload()}
            className="w-full bg-eatrivo-purple hover:bg-eatrivo-purple/90"
          >
            Skúsiť znova
          </Button>
          
          <Link href="/dashboard">
            <Button variant="outline" className="w-full">
              Prejsť na Dashboard
            </Button>
          </Link>
        </div>

        <p className="text-xs text-gray-500">
          Po obnovení pripojenia sa stránka automaticky aktualizuje
        </p>
      </div>
    </div>
  );
}
