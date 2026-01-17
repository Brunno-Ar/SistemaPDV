import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { InactivityMonitor } from "@/components/inactivity-monitor";
import { PasswordChangeAlert } from "@/components/PasswordChangeAlert";

import { TrialBanner } from "@/components/trial-banner";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SyncManager } from "@/components/sync-manager";
import { Analytics } from "@vercel/analytics/next";
import { NetworkProvider } from "@/components/network-provider";

import dynamicLoader from "next/dynamic";

const OnboardingTour = dynamicLoader(
  () =>
    import("@/components/onboarding-tour").then((mod) => mod.OnboardingTour),
  { ssr: false }
);

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || "http://localhost:3000"),
  title: "FlowPDV - Sistema de Gestão",
  description: "Sistema de Ponto de Venda com controle de estoque",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "FlowPDV - Sistema de Gestão",
    description: "Sistema de Ponto de Venda com controle de estoque",
    images: ["/og-image.png"],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="pt-BR" className="h-full">
      <body
        className={`${inter.className} h-full overflow-hidden flex flex-col`}
      >
        <Providers>
          <NetworkProvider>
            <SyncManager />
            <InactivityMonitor />
            <PasswordChangeAlert />
            <TrialBanner />
            {session?.user && <OnboardingTour />}
            <div
              id="main-scroll-container"
              className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
            >
              {children}
            </div>
          </NetworkProvider>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
