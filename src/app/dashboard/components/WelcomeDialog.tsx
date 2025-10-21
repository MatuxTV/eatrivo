"use client";

import { ChefHat, ReceiptText, Target, UtensilsCrossed,CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import type { Session } from "next-auth";
import { DialogTitle } from "@radix-ui/react-dialog";

interface WelcomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session;
}

export default function WelcomeDialog({
  open,
  onOpenChange,
  session,
}: WelcomeDialogProps) {
  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md p-0 gap-0 overflow-hidden"
        showCloseButton={false}
      >
        {/* Header with gradient */}
        <div className="bg-eatrivo-purple p-6 text-white">
          <div className="flex items-center justify-center mb-2">
            <ChefHat className="w-12 h-12" />
          </div>
          <DialogTitle className="text-2xl font-bold text-center text-white">
            Vitajte v aplikacii Eatrivo, {session?.user?.name?.split(" ")[0]}! 👋
          </DialogTitle>
          <p className="text-center text-white/95 mt-2">
            Sme radi, že si prijal pozvánku na testovanie
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 bg-primary-foreground">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-eatrivo-green/10 flex items-center justify-center flex-shrink-0 mt-1">
                <ReceiptText className="w-4 h-4 text-eatrivo-green" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Váš denný plán</h3>
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
                  Sledujte ciele -{" "}
                  <span className="font-bold text-eatrivo-purple">Coming Soon</span>
                </h3>
                <p className="text-sm text-gray-600">
                  Monitorujte váš pokrok k zdravšiemu životnému štýlu
                </p>
              </div>
            </div>
          </div>

          {/* Tip Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4 flex items-center gap-2">
            <CircleAlert className="w-4 h-4 text-blue-800" />
            <p className="text-sm text-blue-800">
               <strong>Feedback:</strong> Pri najdení problému sa prosím nebojte ozvať
            </p>
          </div>

        </div>

        {/* Footer */}
        <DialogFooter className="p-6 pt-0 sm:justify-center bg-primary-foreground">
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 text-primary-text hover:scale-105"
            >
              Zavrieť
            </Button>
            <Button
              onClick={handleClose}
              className="flex-1 bg-eatrivo-purple hover:bg-eatrivo-purple/90 hover:scale-105"
            >
              Začať
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
