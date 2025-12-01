"use client";

import { PageHeader } from "@/components/ui/page-header";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { MessageLoading } from "@/components/ui/message-loading";
import { usePOS } from "@/hooks/use-pos";
import { useRouter } from "next/navigation";
import {
  ProductGrid,
  CartSummary,
  SaleSuccessScreen,
  ClosedRegisterAlert,
} from "./parts";
import { parseCurrency } from "@/lib/utils";

export default function VenderClient() {
  const router = useRouter();
  const [caixaFechado, setCaixaFechado] = useState(false);
  const [verificandoCaixa, setVerificandoCaixa] = useState(true);

  // Verificar status do caixa ao montar
  useEffect(() => {
    async function checkCaixa() {
      try {
        const res = await fetch("/api/caixa", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          // Se não tiver caixa aberto, ou data for null, bloqueia
          if (!data.caixaAberto) {
            setCaixaFechado(true);
          } else {
            setCaixaFechado(false);
          }
        } else {
          // Se deu erro (401, 500, etc), bloqueia por segurança
          console.error("Erro na resposta da API de caixa");
          setCaixaFechado(true);
        }
      } catch (error) {
        console.error("Erro ao verificar caixa", error);
        // Se deu erro de rede, bloqueia por segurança
        setCaixaFechado(true);
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
    lastPaymentMethod,
    valorRecebido,
    setValorRecebido,
    lastValorRecebido,
    lastTroco,
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
      <SaleSuccessScreen
        total={lastSaleTotal}
        paymentMethod={lastPaymentMethod}
        onNewSale={handleNewSale}
        valorRecebido={lastValorRecebido}
        troco={lastTroco}
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
      <ClosedRegisterAlert
        open={caixaFechado}
        onRedirect={() => router.push("/dashboard")}
      />

      {finalizing && (
        <div className="fixed inset-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-xl border dark:border-zinc-800 flex flex-col items-center gap-4">
            <MessageLoading showText={false} />
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
          valorRecebido={valorRecebido}
          setValorRecebido={setValorRecebido}
          troco={
            valorRecebido !== "" && metodoPagamento === "dinheiro"
              ? parseCurrency(valorRecebido) - total
              : null
          }
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
