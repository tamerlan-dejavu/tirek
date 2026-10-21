import "@fontsource-variable/inter";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { Providers } from "@/components/providers";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Tirek — инженерное сопровождение жилых домов", template: "%s · Tirek" },
  description:
    "Цифровая платформа инженерного сопровождения многоквартирных домов: обследования, дефекты, риски, план работ.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#101D2C" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
