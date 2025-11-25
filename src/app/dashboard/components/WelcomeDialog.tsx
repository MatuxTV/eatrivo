"use client";

import {
  ChefHat,
  ReceiptText,
  Target,
  UtensilsCrossed,
  Sparkles,
  Check,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";

interface WelcomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  version: string;
  changelog?: {
    title: string;
    features: readonly string[];
    releaseDate: string;
  };
}

export default function WelcomeDialog({
  open,
  onOpenChange,
  version,
  changelog,
}: WelcomeDialogProps) {
  const { data: session } = useSession();
  
  const handleClose = () => {
    onOpenChange(false);
  };

  const isUpdate =
    session?.user?.lastSeenWelcomeVersion &&
    session.user.lastSeenWelcomeVersion !== version;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md p-0 gap-0 overflow-hidden border-none shadow-2xl rounded-3xl bg-white"
        showCloseButton={false}
      >
        <div className="relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-eatrivo-purple/5 to-transparent z-0" />

          <div className="relative z-10 p-8 pb-0 flex flex-col items-center text-center">
            {/* Icon */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="w-20 h-20 rounded-3xl bg-eatrivo-purple/10 flex items-center justify-center mb-6 shadow-sm"
            >
              {isUpdate ? (
                <Sparkles className="w-10 h-10 text-eatrivo-purple" />
              ) : (
                <ChefHat className="w-10 h-10 text-eatrivo-purple" />
              )}
            </motion.div>

            {/* Title & Version */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Badge
                variant="secondary"
                className="mb-3 bg-eatrivo-purple/10 text-eatrivo-purple hover:bg-eatrivo-purple/20 border-none"
              >
                Verzia {version}
              </Badge>
              <DialogTitle className="text-2xl font-bold text-gray-900 mb-2">
                {isUpdate
                  ? `Nové v Eatrivo! 🎉`
                  : `Vitajte, ${session?.user?.name?.split(" ")[0]}! 👋`}
              </DialogTitle>
              <p className="text-gray-500 text-sm max-w-xs mx-auto">
                {isUpdate
                  ? changelog?.title ||
                    "Pozrite sa, čo sme pre vás pripravili v novej verzii."
                  : "Sme radi, že ste sa k nám pridali na ceste za zdravším životným štýlom."}
              </p>
            </motion.div>
          </div>

          {/* Content Area */}
          <div className="p-8 pt-6">
            {changelog && changelog.features.length > 0 ? (
              // Changelog Features
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 text-center">
                  {isUpdate ? "Čo je nové" : "Hlavné funkcie"}
                </h3>
                <div className="grid gap-3">
                  {changelog.features.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.2 + index * 0.1 }}
                      className="flex items-start gap-3 bg-gray-50 p-3 rounded-xl"
                    >
                      <div className="w-5 h-5 rounded-full bg-eatrivo-green/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-eatrivo-green" />
                      </div>
                      <span className="text-sm text-gray-700 font-medium leading-tight">
                        {feature}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              // Default Welcome Features
              <div className="space-y-4">
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center gap-4 p-3 rounded-2xl bg-gray-50 border border-gray-100"
                >
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-eatrivo-green">
                    <ReceiptText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">
                      Denný plán
                    </h4>
                    <p className="text-xs text-gray-500">
                      Personalizované jedlá na každý deň
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center gap-4 p-3 rounded-2xl bg-gray-50 border border-gray-100"
                >
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-eatrivo-orange">
                    <UtensilsCrossed className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">
                      Shopping listy
                    </h4>
                    <p className="text-xs text-gray-500">
                      Automatické nákupné zoznamy
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center gap-4 p-3 rounded-2xl bg-gray-50 border border-gray-100 opacity-60"
                >
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-eatrivo-pink">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900 text-sm">
                        Ciele
                      </h4>
                      <Badge
                        variant="outline"
                        className="text-[10px] h-4 px-1 py-0 border-eatrivo-purple text-eatrivo-purple"
                      >
                        Coming Soon
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">
                      Sledovanie vášho pokroku
                    </p>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Action Button */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8"
            >
              <Button
                onClick={handleClose}
                className="w-full bg-eatrivo-purple hover:bg-eatrivo-purple/90 text-white rounded-xl h-12 font-semibold shadow-lg shadow-eatrivo-purple/20 hover:shadow-eatrivo-purple/40 transition-all duration-300"
              >
                {isUpdate ? "Vyskúšať novinky" : "Začať používať"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
