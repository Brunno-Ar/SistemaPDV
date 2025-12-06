import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { db, ProductLocal } from "@/lib/local-db";

export interface Product extends ProductLocal {}

export interface CartItem {
  product: Product;
  quantidade: number;
  descontoAplicado: number;
  subtotal: number;
}

export function usePOS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [metodoPagamento, setMetodoPagamento] = useState("");
  const [valorRecebido, setValorRecebido] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [paymentError, setPaymentError] = useState(false);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [lastSaleTotal, setLastSaleTotal] = useState(0);
  const [lastPaymentMethod, setLastPaymentMethod] = useState("");
  const [lastValorRecebido, setLastValorRecebido] = useState<number | null>(null);
  const [lastTroco, setLastTroco] = useState<number | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Carregar dados iniciais e configurar listeners
  useEffect(() => {
    const savedCart = localStorage.getItem("pdv_cart");
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error("Erro ao carregar carrinho salvo:", e);
      }
    }

    const savedPayment = localStorage.getItem("pdv_payment_method");
    if (savedPayment) {
      setMetodoPagamento(savedPayment);
    }

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOffline(!navigator.onLine);

    // Initial load from Dexie
    searchProducts("");

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Persistência
  useEffect(() => {
    localStorage.setItem("pdv_cart", JSON.stringify(cart));
  }, [cart]);

  const total = cart.reduce((acc, item) => acc + item.subtotal, 0);

  useEffect(() => {
    localStorage.setItem("pdv_payment_method", metodoPagamento);
    // Se mudar para dinheiro ou o total mudar, preenche automaticamente com o total
    if (metodoPagamento === "dinheiro") {
      setValorRecebido(total.toFixed(2).replace(".", ","));
    } else {
      setValorRecebido("");
    }
  }, [metodoPagamento, total]);

  // Busca com Debounce usando Dexie
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      searchProducts(searchTerm);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const searchProducts = async (term: string) => {
    try {
      setLoading(true);
      let results: Product[];

      if (term.trim() === "") {
        // Limit to 50 items for initial view to avoid performance issues
        results = await db.products.limit(50).toArray();
      } else {
        // Search by Name (startsWithIgnoreCase) OR SKU (equals)
        // Dexie doesn't support complex OR queries easily in one go without advanced logic,
        // but we can query both and merge.

        // Option 1: Filter in memory (fast enough for 5000 items)
        // Option 2: Dexie specific queries.

        // Let's try Dexie queries first for performance.
        const byName = await db.products
          .where("nome")
          .startsWithIgnoreCase(term)
          .limit(20)
          .toArray();

        const bySku = await db.products
          .where("sku")
          .equals(term)
          .toArray();

        // Merge and deduplicate
        const merged = [...bySku, ...byName];
        const unique = Array.from(new Map(merged.map(item => [item.id, item])).values());
        results = unique;
      }

      setFilteredProducts(results);
      // We don't necessarily update 'products' state anymore as we rely on search results.
      // But keeping it for compatibility if needed? No, filteredProducts is what matters for UI.
      if (term.trim() === "") setProducts(results);

    } catch (error) {
      console.error("Erro ao buscar produtos localmente:", error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    // Check stock locally (even though we allow negative stock in offline mode, usually we want to warn)
    // The requirement says: "Offline: Force sale (allow negative stock)".
    // So we can relax the check or show a warning but allow add.
    // However, the current logic blocks it.
    // Let's keep blocking for now unless we are explicitly offline?
    // User said: "Resolução de Conflito (Estoque): Opção A (Forçar Venda / Estoque Negativo)".
    // This implies we should allow adding even if stock is 0?
    // "Se o cliente levou o produto e pagou... o sistema tem que registrar... mesmo que estoque fique negativo".
    // So we should REMOVE the block `if (currentQuantity >= product.estoqueAtual)`.

    // However, maybe we should only allow it if we are offline? Or always?
    // "A venda física é soberana". This applies generally.
    // But usually online systems block it.
    // Let's relax it for Offline mode OR if configured.
    // For now, I will allow it but maybe warn?
    // Actually, the prompt says "Transformar... em PWA... funcional offline".
    // I will allow adding to cart regardless of stock logic for now, or maybe just relax it.

    // Let's modify the check to be less strict or remove it.
    // "Estoque insuficiente" toast is annoying if I physically have the item.
    // I'll comment out the blocking check for now to fulfill "Force Sale".

    /*
    const existingItem = cart.find((item) => item.product.id === product.id);
    const currentQuantity = existingItem?.quantidade || 0;

    if (currentQuantity >= product.estoqueAtual) {
      toast({
        title: "Estoque insuficiente",
        description: `Produto ${product.nome} não tem estoque suficiente`,
        variant: "destructive",
      });
      return;
    }
    */

    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex(
        (item) => item.product.id === product.id
      );

      if (existingItemIndex >= 0) {
        const newCart = [...prevCart];
        const newQuantity = newCart[existingItemIndex].quantidade + 1;
        const desconto = newCart[existingItemIndex].descontoAplicado;
        newCart[existingItemIndex] = {
          ...newCart[existingItemIndex],
          quantidade: newQuantity,
          subtotal: newQuantity * product.precoVenda - desconto,
        };
        return newCart;
      } else {
        return [
          ...prevCart,
          {
            product,
            quantidade: 1,
            descontoAplicado: 0,
            subtotal: product.precoVenda,
          },
        ];
      }
    });
  };

  const updateCartItemQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    // Removing stock check here too.

    setCart((prevCart) =>
      prevCart.map((item) =>
        item.product.id === productId
          ? {
            ...item,
            quantidade: newQuantity,
            subtotal:
              newQuantity * item.product.precoVenda - item.descontoAplicado,
          }
          : item
      )
    );
  };

  const updateCartItemDesconto = (productId: string, desconto: number) => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.product.id === productId) {
          const maxDesconto = item.quantidade * item.product.precoVenda;
          const descontoValido = Math.max(0, Math.min(desconto, maxDesconto));
          return {
            ...item,
            descontoAplicado: descontoValido,
            subtotal:
              item.quantidade * item.product.precoVenda - descontoValido,
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prevCart) =>
      prevCart.filter((item) => item.product.id !== productId)
    );
  };

  const clearCart = () => {
    setCart([]);
    setMetodoPagamento("");
    setValorRecebido("");
    localStorage.removeItem("pdv_cart");
    localStorage.removeItem("pdv_payment_method");
  };

  const finalizarVenda = async () => {
    if (cart.length === 0) {
      toast({
        title: "Carrinho vazio",
        description: "Adicione produtos ao carrinho antes de finalizar",
        variant: "destructive",
      });
      return;
    }

    if (!metodoPagamento) {
      setPaymentError(true);
      toast({
        title: "Forma de Pagamento Obrigatória",
        description: "Selecione a Forma de Pagamento antes de finalizar!",
        variant: "destructive",
      });
      setTimeout(() => setPaymentError(false), 3000);
      return;
    }

    const total = cart.reduce((acc, item) => acc + item.subtotal, 0);
    let trocoCalculado: number | null = null;
    let valorRecebidoNum: number | null = null;

    if (metodoPagamento === "dinheiro") {
      valorRecebidoNum = parseFloat(valorRecebido.replace(",", "."));

      if (isNaN(valorRecebidoNum) || valorRecebidoNum < total) {
        toast({
          title: "Valor recebido insuficiente",
          description: "O valor recebido deve ser maior ou igual ao total da venda.",
          variant: "destructive",
        });
        return;
      }
      trocoCalculado = valorRecebidoNum - total;
    }

    setFinalizing(true);
    setPaymentError(false);

    const salePayload = {
      items: cart.map((item) => ({
        productId: item.product.id,
        quantidade: item.quantidade,
        precoUnitario: item.product.precoVenda,
        descontoAplicado: item.descontoAplicado,
      })),
      metodoPagamento,
      valorRecebido: metodoPagamento === "dinheiro" ? valorRecebidoNum : null,
      troco: trocoCalculado,
    };

    try {
      // Try to send to API first
      if (navigator.onLine) {
         const response = await fetch("/api/sales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(salePayload),
        });

        const data = await response.json();

        if (!response.ok)
          throw new Error(data.error || "Erro ao finalizar venda");

        toast({
          title: "Venda realizada",
          description: "Venda registrada com sucesso!",
          variant: "default",
        });
      } else {
        throw new Error("Offline"); // Force offline handling
      }

    } catch (error) {
      console.log("Saving offline:", error);

      // Save locally
      try {
        await db.offlineSales.add({
          payload: salePayload,
          timestamp: Date.now()
        });

        toast({
          title: "Venda Salva Localmente",
          description: "Será enviada quando houver internet.",
          className: "bg-yellow-500 text-white", // Visual feedback
        });
      } catch (dbError) {
        console.error("Critical: Failed to save locally", dbError);
        toast({
          title: "Erro Crítico",
          description: "Não foi possível salvar a venda. Tente novamente.",
          variant: "destructive",
        });
        setFinalizing(false);
        return; // Do not clear cart
      }
    }

    // Success (either online or offline saved)
    setLastSaleTotal(total);
    setLastPaymentMethod(metodoPagamento);
    setLastValorRecebido(valorRecebidoNum);
    setLastTroco(trocoCalculado);

    setShowSuccessScreen(true);
    clearCart();
    setFinalizing(false);

    // Refresh local stock if needed (optional, logic might be complex locally without full sync)
  };

  const handleNewSale = () => {
    setShowSuccessScreen(false);
    clearCart();
  };

  return {
    products,
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
  };
}
