import type { ReactNode } from "react";

import { Shell } from "@/components/layout/Shell";
import { ProviderSidebar } from "@/components/layout/Sidebar";

export default function PlatformLayout({ children }: { children: ReactNode }) {
  return <Shell sidebar={<ProviderSidebar />}>{children}</Shell>;
}
