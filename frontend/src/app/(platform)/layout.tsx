import type { ReactNode } from "react";

import { Shell } from "@/components/layout/Shell";
import { PROVIDER_NAV } from "@/components/layout/Sidebar";

export default function PlatformLayout({ children }: { children: ReactNode }) {
  return <Shell nav={PROVIDER_NAV}>{children}</Shell>;
}
