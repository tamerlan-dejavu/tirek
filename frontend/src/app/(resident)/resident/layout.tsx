import type { ReactNode } from "react";

import { Shell } from "@/components/layout/Shell";
import { RESIDENT_NAV } from "@/components/layout/Sidebar";

/** Resident cabinet: requests, planned works, polls. No engineering data. */
export default function ResidentLayout({ children }: { children: ReactNode }) {
  return <Shell nav={RESIDENT_NAV}>{children}</Shell>;
}
