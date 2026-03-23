import { useEffect, useRef, useCallback, useState } from "react";
import { toast } from "@/hooks/use-toast";

interface BarcodeLookupData {
  nome?: string;
  marca?: string;
  categoria?: string;
  imagemUrl?: string;
  peso?: string;
}

interface UseBarcodeFormScannerOptions {
  enabled?: boolean;
  onBarcodeScanned: (barcode: string, data?: BarcodeLookupData) => void;
}

export function useBarcodeFormScanner({
  enabled = true,
  onBarcodeScanned,
}: UseBarcodeFormScannerOptions) {
  const bufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProcessingRef = useRef(false);
  const [isLooking, setIsLooking] = useState(false);

  const MAX_KEY_INTERVAL = 50;
  const MIN_BARCODE_LENGTH = 3;

  const lookupBarcode = useCallback(
    async (barcode: string) => {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;
      setIsLooking(true);

      try {
        const trimmed = barcode.trim();
        if (trimmed.length < MIN_BARCODE_LENGTH) return;

        toast({
          title: "🔍 Scanner detectado!",
          description: `Buscando informações para: ${trimmed}...`,
        });

        const response = await fetch(
          `/api/barcode/lookup?code=${encodeURIComponent(trimmed)}`,
        );
        const result = await response.json();

        if (result.found && result.data) {
          onBarcodeScanned(trimmed, result.data);
          const productName = result.data.nome || "Sem nome";
          toast({
            title: "✅ Produto encontrado!",
            description: `${productName} (${result.source}) — Dados preenchidos automaticamente.`,
          });
        } else {
          onBarcodeScanned(trimmed);
          toast({
            title: "📦 SKU preenchido",
            description: `Código ${trimmed} adicionado. Produto não encontrado nas bases — preencha manualmente.`,
          });
        }
      } catch {
        onBarcodeScanned(barcode.trim());
        toast({
          title: "📦 SKU preenchido",
          description:
            "Erro na consulta das bases. SKU foi preenchido, preencha os dados manualmente.",
          variant: "destructive",
        });
      } finally {
        isProcessingRef.current = false;
        setIsLooking(false);
      }
    },
    [onBarcodeScanned],
  );

  const resetBuffer = useCallback(() => {
    bufferRef.current = "";
    lastKeyTimeRef.current = 0;
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const timeSinceLastKey = now - lastKeyTimeRef.current;

      if (e.key === "Enter") {
        const currentBuffer = bufferRef.current;
        if (currentBuffer.length >= MIN_BARCODE_LENGTH) {
          e.preventDefault();
          e.stopPropagation();
          lookupBarcode(currentBuffer);
        }
        resetBuffer();
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (
          timeSinceLastKey > MAX_KEY_INTERVAL &&
          bufferRef.current.length > 0
        ) {
          resetBuffer();
        }

        bufferRef.current += e.key;
        lastKeyTimeRef.current = now;

        if (
          bufferRef.current.length > 1 &&
          timeSinceLastKey <= MAX_KEY_INTERVAL
        ) {
          e.preventDefault();
          e.stopPropagation();
        }

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          resetBuffer();
        }, 200);
      }
    };

    document.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, lookupBarcode, resetBuffer]);

  return { isLooking };
}
