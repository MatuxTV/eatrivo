import type { ReactNode } from "react";
import { APP_SHELL_BOTTOM_NAV_OFFSET_CLASS } from "@/app/home/constants/app-shell";

type AppShellViewportTag = "div" | "main" | "section";

interface AppShellViewportProps {
  as?: AppShellViewportTag;
  children: ReactNode;
  className?: string;
  includeBottomNavOffset?: boolean;
}

export default function AppShellViewport({
  as = "div",
  children,
  className = "",
  includeBottomNavOffset = true,
}: AppShellViewportProps) {
  const Tag = as;
  const classes = [
    className,
    includeBottomNavOffset ? APP_SHELL_BOTTOM_NAV_OFFSET_CLASS : "",
  ]
    .filter(Boolean)
    .join(" ");

  return <Tag className={classes}>{children}</Tag>;
}
