"use client";

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { User } from "lucide-react";
import { useSession } from "next-auth/react";

export default function HomeHeader() {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <div className="fixed left-0 right-0 top-0 z-40 border-b border-eatrivo-black-secondary/10 bg-eatrivo-white-primary  px-4 py-1 backdrop-blur-md md:hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex justify-start rounded-full px-2 py-0.5 transition-transform duration-200 active:scale-[0.98]">
          <Image
            src="/logo/LOGO_ROW.png"
            alt="Eatrivo"
            width={110}
            height={30}
            priority
            className="h-auto py-1 w-[7.5rem]"
          />  
        </div>
          {user?.image ? (
            <Image
              src={user.image}
              alt={user.name || "Profile"}
              width={40}
              height={40}
              className="h-8 w-8 rounded-full ring-2 ring-eatrivo-purple/20 object-cover"
            />
          ) : (
            <div className="flex h-8 w-8   items-center justify-center rounded-full bg-eatrivo-purple/10 ring-2 ring-eatrivo-purple/10">
              <User className="h-5 w-5 text-eatrivo-purple" />
            </div>
          )}
      </div>
    </div>
  );
}
