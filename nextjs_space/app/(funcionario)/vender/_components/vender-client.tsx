"use client";

import { PageHeader } from "@/components/ui/page-header";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  ClassicLoader,
  AnimatedLoadingSkeleton,
} from "@/components/ui/loading";
import { usePOS } from "@/hooks/use-pos";
import { useRouter } from "next/navigation";
import {
  ProductGrid,
  CartSummary,
  SaleSuccessScreen,
  ClosedRegisterAlert,
} from "./parts";
import { parseCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ShoppingCart } from "lucide-react";

import { useSession } from "next-auth/react";

export default function VenderClient() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [caixaFechado, setCaixaFechado] = useState(false);
  const [verificandoCaixa, setVerificandoCaixa] = useState(true);

  // Verificar status do caixa ao montar
  useEffect(() => {
    async function checkCaixa() {
      // Se a sessão ainda estiver carregando, aguarda
      if (status === "loading") return;

      // Se for Admin ou Master, libera o acesso direto (sem precisar de caixa)
      if (session?.user?.role === "admin" || session?.user?.role === "master") {
        setCaixaFechado(false);
        setVerificandoCaixa(false);
        return;
      }

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

        // Se estiver offline, LIBERA o acesso para vender
        if (!navigator.onLine) {
          console.log("Offline: Liberando acesso ao caixa.");
          setCaixaFechado(false);
        } else {
          // Se online e deu erro, bloqueia por segurança
          setCaixaFechado(true);
        }
      } finally {
        setVerificandoCaixa(false);
      }
    }
    checkCaixa();
  }, [session, status]);

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
    sortOption,
    setSortOption,
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
      <div className="container mx-auto py-10">
        <AnimatedLoadingSkeleton />
      </div>
    );
  }

  const total = cart.reduce((acc, item) => acc + item.subtotal, 0);

  return (
    <div className="min-h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)] bg-[#eff2f6] dark:bg-[#101922] p-4 lg:p-6 rounded-3xl lg:overflow-hidden flex flex-col relative pb-24 lg:pb-6">
      <ClosedRegisterAlert
        open={caixaFechado}
        onRedirect={() => router.push("/dashboard")}
      />

      {finalizing && (
        <div className="fixed inset-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-xl border dark:border-zinc-800 flex flex-col items-center gap-4">
            <ClassicLoader className="w-12 h-12 border-4" />
            <p className="font-medium text-lg text-gray-700 dark:text-gray-300">
              Processando Venda...
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-auto lg:h-full lg:overflow-hidden">
        {/* Left Column: Products (60%) */}
        <div className="lg:col-span-3 flex flex-col h-auto lg:h-full lg:overflow-hidden min-h-0">
          <div className="flex-none">
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
          </div>

          <div className="flex-1 min-h-0 mt-6">
            <ProductGrid
              products={filteredProducts}
              onAddToCart={addToCart}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              searchInputRef={searchInputRef}
              sortOption={sortOption}
              onSortChange={setSortOption}
            />
          </div>
        </div>

        {/* Right Column: Cart (40%) - Desktop Only */}
        <div className="hidden lg:block lg:col-span-2 h-full min-h-0 sticky top-0">
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

      {/* Mobile Cart Trigger & Sheet */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <Sheet>
          <SheetTrigger asChild>
            <Button className="w-full h-14 text-lg font-bold shadow-lg bg-primary hover:bg-primary/90 text-white rounded-xl flex items-center justify-between px-6">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-6 w-6" />
                <span>
                  {cart.length} {cart.length === 1 ? "item" : "itens"}
                </span>
              </div>
              <span>R$ {total.toFixed(2)}</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[90vh] p-0 rounded-t-2xl">
            <div className="h-full pt-6">
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
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
