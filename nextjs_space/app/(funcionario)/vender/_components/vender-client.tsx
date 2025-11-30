"use client";

import { PageHeader } from "@/components/ui/page-header";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { MessageLoading } from "@/components/ui/message-loading";
import SaleCompletedScreen from "./sale-completed-screen";
import { usePOS } from "@/hooks/use-pos";
import { ProductGrid } from "./product-grid";
import { CartSummary } from "./cart-summary";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";

export default function VenderClient() {
  const router = useRouter();
  const [caixaFechado, setCaixaFechado] = useState(false);
  const [verificandoCaixa, setVerificandoCaixa] = useState(true);

  // Verificar status do caixa ao montar
  useEffect(() => {
    async function checkCaixa() {
      try {
        const res = await fetch("/api/caixa");
        if (res.ok) {
          const data = await res.json();
          if (!data.caixaAberto) {
            setCaixaFechado(true);
          }
        }
      } catch (error) {
        console.error("Erro ao verificar caixa", error);
      } finally {
        setVerificandoCaixa(false);
      }
    }
    checkCaixa();
  }, []);

  const {
    filteredProducts,
    cart,
    searchTerm,
    setSearchTerm,
    metodoPagamento,
    setMetodoPagamento,
    loading,
    finalizing,
    paymentError,
    setPaymentError,
    showSuccessScreen,
    lastSaleTotal,
    isOffline,
    searchInputRef,
    addToCart,
    updateCartItemQuantity,
    updateCartItemDesconto,
    removeFromCart,
    clearCart,
    finalizarVenda,
    handleNewSale,
  } = usePOS();

  // Atalhos de Teclado (Mantidos aqui pois dependem de refs e window events)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "F12") {
        e.preventDefault();
        if (cart.length > 0) {
          const btn = document.getElementById("btn-finalizar-venda");
          if (btn) btn.click();
        }
      } else if (e.key === "Escape") {
        if (document.activeElement === searchInputRef.current) {
          setSearchTerm("");
          searchInputRef.current?.blur();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart.length, searchInputRef, setSearchTerm]);

  if (showSuccessScreen) {
    return (
      <SaleCompletedScreen
        total={lastSaleTotal}
        paymentMethod={metodoPagamento}
        onNewSale={handleNewSale}
      />
    );
  }

  if (loading || verificandoCaixa) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <MessageLoading />
      </div>
    );
  }

  const total = cart.reduce((acc, item) => acc + item.subtotal, 0);

  return (
    <div className="space-y-6 lg:grid lg:grid-cols-5 lg:gap-6 lg:space-y-0 relative">
      <AlertDialog open={caixaFechado}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Caixa Fechado</AlertDialogTitle>
            <AlertDialogDescription>
              Por favor, abra o caixa no Dashboard para iniciar as vendas.
              Todas as operações de venda estão bloqueadas até a abertura do caixa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => router.push("/dashboard")}>
              Ir para Dashboard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {finalizing && (
        <div className="fixed inset-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-xl border dark:border-zinc-800 flex flex-col items-center gap-4">
            <MessageLoading />
            <p className="font-medium text-lg text-gray-700 dark:text-gray-300">
              Processando Venda...
            </p>
          </div>
        </div>
      )}

      <div className="lg:col-span-3 space-y-6">
        <PageHeader
          title="Ponto de Venda"
          description={
            isOffline
              ? "Modo Offline Ativo"
              : "Selecione os produtos para venda"
          }
          actions={
            isOffline && (
              <Badge variant="destructive" className="animate-pulse">
                Sem Conexão
              </Badge>
            )
          }
        />

        <ProductGrid
          products={filteredProducts}
          onAddToCart={addToCart}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchInputRef={searchInputRef}
        />
      </div>

      <div className="lg:col-span-2">
        <CartSummary
          cart={cart}
          onUpdateQuantity={updateCartItemQuantity}
          onRemove={removeFromCart}
          onUpdateDiscount={updateCartItemDesconto}
          paymentMethod={metodoPagamento}
          onPaymentMethodChange={setMetodoPagamento}
          onFinalize={finalizarVenda}
          onClear={clearCart}
          isOffline={isOffline}
          finalizing={finalizing}
          paymentError={paymentError}
          setPaymentError={setPaymentError}
          total={total}
        />
      </div>
    </div>
  );
}
