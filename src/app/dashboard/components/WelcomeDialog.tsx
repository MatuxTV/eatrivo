"use client";

import {
  ChefHat,
  ReceiptText,
  Target,
  UtensilsCrossed,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import type { Session } from "next-auth";
import { DialogTitle } from "@radix-ui/react-dialog";

interface WelcomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session;
  version: string;
  changelog?: {
    title: string;
    features: readonly string[]; // ✅ Pridať readonly
    releaseDate: string;
  };
}

export default function WelcomeDialog({
  open,
  onOpenChange,
  session,
  version,
  changelog,
}: WelcomeDialogProps) {
  const handleClose = () => {
    onOpenChange(false);
  };

  const isUpdate =
    session?.user?.lastSeenWelcomeVersion &&
    session.user.lastSeenWelcomeVersion !== version;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md p-0 gap-0 overflow-hidden"
        showCloseButton={false}
      >
        {/* Header with gradient */}
        <div className="bg-eatrivo-purple p-6 text-white">
          <div className="flex items-center justify-center mb-2">
            {isUpdate ? (
              <Sparkles className="w-12 h-12" />
            ) : (
              <ChefHat className="w-12 h-12" />
            )}
          </div>
          <DialogTitle className="text-2xl font-bold text-center text-white">
            {isUpdate
              ? `Nové v Eatrivo ${version}! 🎉`
              : `Vitajte v aplikácii Eatrivo, ${
                  session?.user?.name?.split(" ")[0]
                }! 👋`}
          </DialogTitle>
          <p className="text-center text-white/95 mt-2">
            {isUpdate
              ? changelog?.title || "Máme pre vás nové funkcie"
              : "Sme radi, že ste sa k nám pridali"}
          </p>
          {/* Version badge */}
          <div className="mt-3 flex justify-center">
            <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold">
              Verzia {version}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 bg-primary-foreground">
          {changelog && changelog.features.length > 0 ? (
            // Show changelog if available
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-eatrivo-purple" />
                {isUpdate ? "Čo je nové:" : "Hlavné funkcie:"}
              </h3>
              <ul className="space-y-2">
                {changelog.features.map((feature, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-gray-700"
                  >
                    <span className="text-eatrivo-purple mt-1">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            // Default features if no changelog
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-eatrivo-green/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <ReceiptText className="w-4 h-4 text-eatrivo-green" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Váš denný plán
                  </h3>
                  <p className="text-sm text-gray-600">
                    Pozrite si personalizované jedlá na dnes
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-eatrivo-orange/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <UtensilsCrossed className="w-4 h-4 text-eatrivo-orange" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Jedálne plány</h3>
                  <p className="text-sm text-gray-600">
                    Spravujte svoje týždenné shopping listy
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-eatrivo-pink/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <Target className="w-4 h-4 text-eatrivo-pink" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Sledujte ciele{" "}
                    <span className="font-bold text-eatrivo-purple">
                      Coming Soon
                    </span>
                  </h3>
                  <p className="text-sm text-gray-600">
                    Monitorujte váš pokrok k zdravšiemu životnému štýlu
                  </p>
                </div>
              </div>
            </div>
          )} 

        </div>

        {/* Footer */}
        <DialogFooter className="p-6 pt-0 sm:justify-center bg-primary-foreground">
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 text-primary-text hover:scale-105"
            >
              {isUpdate ? "Neskôr" : "Zavrieť"}
            </Button>
            <Button
              onClick={handleClose}
              className="flex-1 bg-eatrivo-purple hover:bg-eatrivo-purple/90 hover:scale-105"
            >
              {isUpdate ? "Vyskúšať" : "Začať"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
