"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { db } from "@/lib/local-db";
import { toast } from "@/hooks/use-toast";
import { PRODUCTS_SYNCED_EVENT } from "@/lib/events";

export function SyncManager() {
  const { status } = useSession();
  const hasSynced = useRef(false);

  // 1. Clear DB on Logout
  useEffect(() => {
    if (status === "unauthenticated") {
      hasSynced.current = false;
      db.delete()
        .then(() => {
          console.log("Local DB cleared on logout");
        })
        .catch((err) => console.error("Error clearing DB", err));
    }
  }, [status]);

  // 2. Initial Load Sync (Download)
  useEffect(() => {
    if (status === "authenticated" && navigator.onLine && !hasSynced.current) {
      hasSynced.current = true;
      syncProducts();
    }
  }, [status]);

  // 3. Sync Loop (Upload Offline Sales)
  useEffect(() => {
    if (status !== "authenticated") return;

    const handleOnline = () => {
      console.log("Back online! Syncing sales...");
      syncOfflineSales();
      syncProducts(); // Refresh catalog too
    };

    window.addEventListener("online", handleOnline);

    // Initial check if we came online before mounting or just mounted online
    if (navigator.onLine) {
      syncOfflineSales();
    }

    return () => window.removeEventListener("online", handleOnline);
  }, [status]);

  async function syncProducts() {
    try {
      // Garantir que o banco está aberto antes de operar
      await db.open();

      const res = await fetch("/api/sync/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      const products = await res.json();

      await db.transaction("rw", db.products, async () => {
        await db.products.clear();
        await db.products.bulkAdd(products);
      });

      console.log("Products synced:", products.length);

      // Emitir evento de sucesso
      window.dispatchEvent(
        new CustomEvent(PRODUCTS_SYNCED_EVENT, {
          detail: { success: true, count: products.length },
        })
      );
    } catch (error) {
      console.error("Sync products failed:", error);

      // Emitir evento de falha (para que o POS ainda tente carregar do cache se existir)
      window.dispatchEvent(
        new CustomEvent(PRODUCTS_SYNCED_EVENT, {
          detail: { success: false, error },
        })
      );
    }
  }

  async function syncOfflineSales() {
    try {
      await db.open();
      const count = await db.offlineSales.count();
      if (count === 0) return;

      const sales = await db.offlineSales.toArray();

      for (const sale of sales) {
        try {
          const res = await fetch("/api/sales", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(sale.payload),
          });

          if (res.ok) {
            await db.offlineSales.delete(sale.id!);
            toast({
              title: "Sincronizado",
              description: "Venda offline enviada com sucesso!",
            });
          } else {
            console.error("Failed to sync sale", sale.id, res.statusText);
          }
        } catch (error) {
          console.error("Network error during sync", error);
          break; // Stop syncing if network fails again
        }
      }
    } catch (error) {
      console.error("Error syncing offline sales:", error);
    }
  }

  return null;
}
