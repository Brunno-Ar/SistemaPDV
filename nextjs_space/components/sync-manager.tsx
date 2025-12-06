"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { db } from "@/lib/local-db";
import { toast } from "@/hooks/use-toast";

export function SyncManager() {
  const { data: session, status } = useSession();

  // 1. Clear DB on Logout
  useEffect(() => {
    if (status === "unauthenticated") {
      db.delete()
        .then(() => {
          console.log("Local DB cleared on logout");
        })
        .catch((err) => console.error("Error clearing DB", err));
    }
  }, [status]);

  // 2. Initial Load Sync (Download)
  useEffect(() => {
    if (status === "authenticated" && navigator.onLine) {
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
      const res = await fetch("/api/sync/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      const products = await res.json();

      await db.transaction("rw", db.products, async () => {
        await db.products.clear();
        await db.products.bulkAdd(products);
      });
      console.log("Products synced:", products.length);
    } catch (error) {
      console.error("Sync products failed:", error);
    }
  }

  async function syncOfflineSales() {
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
  }

  return null;
}
