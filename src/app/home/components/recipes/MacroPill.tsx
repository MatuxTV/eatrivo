import { cn } from "@/lib/utils/utils";

interface MacroPillProps {
  value: string;
  label: string;
  highlight?: boolean;
}

/** Small nutrition chip: `14 g` + `protein`. */
export function MacroPill({ value, label, highlight }: MacroPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1 rounded-full px-2.5 py-1.5",
        highlight ? "bg-[#F6F0FF]" : "bg-[#FAFAFA]",
      )}
    >
      <span
        className={cn(
          "text-[14px] font-bold leading-[18px]",
          highlight ? "text-eatrivo-purple" : "text-gray-900",
        )}
      >
        {value}
      </span>
      <span className="text-[12px] font-medium text-gray-500">{label}</span>
    </span>
  );
}
