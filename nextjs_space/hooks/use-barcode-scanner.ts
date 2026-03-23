import { useEffect, useRef, useCallback } from "react";
import { db } from "@/lib/local-db";
import { toast } from "@/hooks/use-toast";
import { Product } from "@/hooks/use-pos";

interface UseBarcodeOptions {
  onProductFound: (product: Product) => void;
  enabled?: boolean;
}

export function useBarcodeScanner({ onProductFound, enabled = true }: UseBarcodeOptions) {
  const bufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProcessingRef = useRef(false);

  const MAX_KEY_INTERVAL = 50;
  const MIN_BARCODE_LENGTH = 3;

  const processBarcode = useCallback(async (barcode: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      const trimmed = barcode.trim();
      if (trimmed.length < MIN_BARCODE_LENGTH) return;

      const product = await db.products
        .where("sku")
        .equals(trimmed)
        .first();

      if (!product) {
        const productInsensitive = await db.products
          .filter((p) => p.sku?.toLowerCase() === trimmed.toLowerCase())
          .first();

        if (productInsensitive) {
          onProductFound(productInsensitive);
          toast({
            title: "📦 Scanner: Produto adicionado!",
            description: `${productInsensitive.nome} (SKU: ${productInsensitive.sku})`,
          });
          return;
        }

        toast({
          title: "❌ SKU não encontrado",
          description: `Nenhum produto com SKU "${trimmed}" foi encontrado.`,
          variant: "destructive",
        });
        return;
      }

      onProductFound(product);
      toast({
        title: "📦 Scanner: Produto adicionado!",
        description: `${product.nome} (SKU: ${product.sku})`,
      });
    } catch (error) {
      console.error("Erro ao processar código de barras:", error);
      toast({
        title: "Erro no Scanner",
        description: "Falha ao buscar produto. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      isProcessingRef.current = false;
    }
  }, [onProductFound]);

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
          processBarcode(currentBuffer);
        }

        resetBuffer();
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (timeSinceLastKey > MAX_KEY_INTERVAL && bufferRef.current.length > 0) {
          resetBuffer();
        }

        bufferRef.current += e.key;
        lastKeyTimeRef.current = now;

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          resetBuffer();
        }, 200);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, processBarcode, resetBuffer]);

  return { resetBuffer };
}
