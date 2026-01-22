import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import type { User } from "../types";

interface StatsCardProps {
  users: User[];
}

export default function StatsCard({ users }: StatsCardProps) {
  const totalUsers = users.length;
  const premiumUsers = users.filter(u => u.membership?.toLowerCase() === "premium").length;
  const basicUsers = users.filter(u => u.membership?.toLowerCase() === "basic").length;
  const trainerUsers = users.filter(u => u.membership?.toLowerCase() === "trainer").length;

  return (
    <Card className="border-none shadow-lg bg-gradient-to-br from-eatrivo-purple to-eatrivo-pink text-white overflow-hidden relative">
      <div className="absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 bg-white/10 rounded-full -mr-8 sm:-mr-10 -mt-8 sm:-mt-10 blur-2xl" />
      <div className="absolute bottom-0 left-0 w-20 sm:w-24 h-20 sm:h-24 bg-black/10 rounded-full -ml-8 sm:-ml-10 -mb-8 sm:-mb-10 blur-xl" />

      <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-2">
        <CardTitle className="text-white flex items-center gap-2 text-base sm:text-lg">
          <Users className="w-4 h-4 sm:w-5 sm:h-5" />
          Prehľad používateľov
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-2 sm:pt-2">
        <div className="space-y-3 sm:space-y-4 relative z-10">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl sm:text-4xl font-bold text-white">{totalUsers}</p>
              <p className="text-xs text-white/80">Celkovo používateľov</p>
            </div>
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-3 sm:pt-4 border-t border-white/20">
            <div className="text-center">
              <p className="text-lg sm:text-xl font-bold text-white">{premiumUsers}</p>
              <p className="text-[10px] text-white/70 uppercase tracking-wide">Premium</p>
            </div>
            <div className="text-center border-x border-white/20">
              <p className="text-lg sm:text-xl font-bold text-white">{basicUsers}</p>
              <p className="text-[10px] text-white/70 uppercase tracking-wide">Basic</p>
            </div>
            <div className="text-center">
              <p className="text-lg sm:text-xl font-bold text-white">{trainerUsers}</p>
              <p className="text-[10px] text-white/70 uppercase tracking-wide">Trainer</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
