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
    <html lang="pt-BR">
      <body className={inter.className}>
        <Providers>
          <SyncManager />
          <InactivityMonitor />
          <PasswordChangeAlert />
          <TrialBanner />
          {session?.user && <OnboardingTour />}
          {children}
        </Providers>
      </body>
    </html>
  );
}
