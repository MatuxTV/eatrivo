import * as React from "react";

import { cn } from "@/lib/utils/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-[80px] w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 shadow-sm transition-colors placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eatrivo-purple/20 focus-visible:border-eatrivo-purple disabled:cursor-not-allowed disabled:opacity-50 resize-none md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
