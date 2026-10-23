import type { ReactNode } from "react";

import { Shell } from "@/components/layout/Shell";
import { OSI_NAV } from "@/components/layout/Sidebar";

/** Customer cabinet (ТЗ 12): sees only published data, cannot change engineering conclusions. */
export default function OsiLayout({ children }: { children: ReactNode }) {
  return <Shell nav={OSI_NAV}>{children}</Shell>;
}
