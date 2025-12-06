"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

let globalDeferredPrompt: any = null;

interface InstallPromptProps {
  variant?: "floating" | "inline";
}

export function InstallPrompt({ variant = "floating" }: InstallPromptProps) {
  const { status } = useSession();
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] =
    useState<any>(globalDeferredPrompt);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if already in standalone mode
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsStandalone(true);
    }

    // Check if iOS
    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      globalDeferredPrompt = e;
      setDeferredPrompt(e);
      console.log("Captured beforeinstallprompt event");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      if (isIOS) {
        toast("Instalação no iOS", {
          description:
            "Toque no botão de compartilhar e selecione 'Adicionar à Tela de Início'.",
        });
      }
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    globalDeferredPrompt = null;
    setDeferredPrompt(null);
  };

  if (!mounted) return null;

  // Logic for INLINE variant (Settings page)
  if (variant === "inline") {
    // If installed, show nothing or specific message? User asked to put button in settings.
    // If installed, maybe we show "App Instalado" disabled button.

    // Condition: Only show if authenticated (safety)
    // if (status !== "authenticated") return null; // Logic handled by parent usually, but good to keep.

    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white flex items-center gap-2">
          <Download className="w-5 h-5 text-blue-600" />
          Aplicativo
        </h2>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {isStandalone
              ? "O aplicativo já está instalado e ativo neste dispositivo."
              : "Instale o FlowPDV no seu dispositivo para acessar offline e ter uma melhor experiência."}
          </div>

          {!isStandalone && (
            <Button
              onClick={handleInstallClick}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white gap-2"
              disabled={!deferredPrompt && !isIOS}
            >
              <Download className="h-4 w-4" />
              {isIOS ? "Como Instalar (iOS)" : "Instalar Agora"}
            </Button>
          )}

          {isStandalone && (
            <Button
              variant="outline"
              disabled
              className="w-full sm:w-auto gap-2 opacity-70"
            >
              <Download className="h-4 w-4" />
              Instalado
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Logic for FLOATING variant (Legacy/Corner)
  // ... existing logic for public checks ...
  const publicPaths = [
    "/",
    "/login",
    "/signup",
    "/register",
    "/forgot-password",
    "/termos",
    "/privacidade",
  ];

  const isPublicPath =
    publicPaths.includes(pathname) ||
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/signup");

  if (status !== "authenticated" || isStandalone || isPublicPath) return null;
  if (!deferredPrompt && !isIOS) return null;

  if (isIOS) {
    // iOS floating logic
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-background/90 backdrop-blur-sm border p-4 rounded-lg shadow-lg flex flex-col gap-2 max-w-sm animate-in slide-in-from-bottom-5">
        {/* ... ios content ... */}
        <div className="flex items-center gap-2 font-semibold">
          <Download className="h-4 w-4" />
          Instalar App
        </div>
        <p className="text-sm text-muted-foreground">
          Para instalar no iOS, toque no botão de compartilhar e selecione
          "Adicionar à Tela de Início".
        </p>
        <Button variant="ghost" size="sm" onClick={() => setIsIOS(false)}>
          Entendi
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 animate-in slide-in-from-bottom-10 fade-in duration-700">
      <Button
        onClick={handleInstallClick}
        variant="outline"
        className="rounded-full shadow-2xl bg-background/80 backdrop-blur-md border-muted-foreground/20 hover:bg-muted/50 transition-all font-medium gap-2 h-10 pr-4 pl-3"
      >
        <div className="bg-primary/10 p-1.5 rounded-full">
          <Download className="h-4 w-4 text-primary" />
        </div>
        <span className="text-sm font-medium">Instalar App</span>
      </Button>
    </div>
  );
}
