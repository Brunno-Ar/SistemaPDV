import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { toast } from "@/hooks/use-toast";
import { db, ProductLocal } from "@/lib/local-db";
import { PRODUCTS_SYNCED_EVENT } from "@/lib/events";
import { PaymentInput } from "@/types/api";

export interface Product extends ProductLocal {}

export interface CartItem {
  product: Product;
  quantidade: number;
  descontoAplicado: number;
  subtotal: number;
}

// Interface para pagamentos múltiplos
export interface PaymentItem {
  id: string; // ID único para UI
  method: "dinheiro" | "debito" | "credito" | "pix";
  amount: number;
}

export function usePOS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [sortOption, setSortOption] = useState<string>("name_asc");

  // Ordenação Reativa com useMemo
  const filteredProducts = useMemo(() => {
    const sorted = [...searchResults];

    switch (sortOption) {
      case "name_asc":
        sorted.sort((a, b) => a.nome.localeCompare(b.nome));
        break;
      case "name_desc":
        sorted.sort((a, b) => b.nome.localeCompare(a.nome));
        break;
      case "stock_asc":
        sorted.sort((a, b) => a.estoqueAtual - b.estoqueAtual);
        break;
      case "stock_desc":
        sorted.sort((a, b) => b.estoqueAtual - a.estoqueAtual);
        break;
      case "price_asc":
        sorted.sort((a, b) => a.precoVenda - b.precoVenda);
        break;
      case "price_desc":
        sorted.sort((a, b) => b.precoVenda - a.precoVenda);
        break;
      default:
        break;
    }
    return sorted;
  }, [searchResults, sortOption]);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // ==== MULTI-PAYMENT STATE ====
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [metodoPagamento, setMetodoPagamento] = useState(""); // Mantido para compatibilidade de UI
  const [valorRecebido, setValorRecebido] = useState<string>("");

  const [initialLoading, setInitialLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [paymentError, setPaymentError] = useState(false);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [lastSaleTotal, setLastSaleTotal] = useState(0);
  const [lastPaymentMethod, setLastPaymentMethod] = useState("");
  const [lastValorRecebido, setLastValorRecebido] = useState<number | null>(
    null
  );
  const [lastTroco, setLastTroco] = useState<number | null>(null);
  const [lastPayments, setLastPayments] = useState<PaymentItem[]>([]);
  const [isOffline, setIsOffline] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const hasLoadedProducts = useRef(false);

  // Função para garantir que o banco está pronto
  const ensureDbReady = async (): Promise<boolean> => {
    try {
      await db.open();
      return true;
    } catch (error) {
      console.error("Erro ao abrir banco local:", error);
      return false;
    }
  };

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

    // Listener para quando os produtos forem sincronizados
    const handleProductsSynced = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log("Products synced event received:", customEvent.detail);
      // Recarregar produtos do banco local
      loadProductsFromDb();
    };

    window.addEventListener(PRODUCTS_SYNCED_EVENT, handleProductsSynced);

    // Tentar carregar produtos iniciais
    loadProductsFromDb();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(PRODUCTS_SYNCED_EVENT, handleProductsSynced);
    };
  }, []);

  // Função principal para carregar produtos do banco local
  const loadProductsFromDb = async () => {
    try {
      const dbReady = await ensureDbReady();
      if (!dbReady) {
        console.log("Banco não está pronto, aguardando...");
        // Aguardar um pouco e tentar novamente
        setTimeout(loadProductsFromDb, 500);
        return;
      }

      // Aguardar com retry para dar tempo do sync popular o banco
      const results = await waitForProducts(8, 300);

      setSearchResults(results);
      setProducts(results);
      hasLoadedProducts.current = true;

      if (results.length === 0) {
        console.log("Nenhum produto encontrado no banco local");
      } else {
        console.log(`${results.length} produtos carregados do banco local`);
      }
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      // Não exibir toast de erro aqui pois pode ser race condition normal
    } finally {
      setInitialLoading(false);
    }
  };

  // Persistência
  useEffect(() => {
    localStorage.setItem("pdv_cart", JSON.stringify(cart));
  }, [cart]);

  const total = useMemo(
    () => cart.reduce((acc, item) => acc + item.subtotal, 0),
    [cart]
  );

  // Cálculo do valor restante (total - pagamentos já adicionados)
  const totalPago = useMemo(
    () => payments.reduce((acc, p) => acc + p.amount, 0),
    [payments]
  );

  const valorRestante = useMemo(() => {
    return Math.max(0, total - totalPago);
  }, [total, totalPago]);

  // Cálculo do troco (só se houver dinheiro e exceder o necessário)
  const trocoTotal = useMemo(() => {
    if (payments.length === 0) return 0;

    // Soma de todos os pagamentos
    const somaPagamentos = payments.reduce((acc, p) => acc + p.amount, 0);

    // Troco = soma dos pagamentos - total (só positivo)
    return Math.max(0, somaPagamentos - total);
  }, [payments, total]);

  useEffect(() => {
    localStorage.setItem("pdv_payment_method", metodoPagamento);
  }, [metodoPagamento]);

  // Busca com Debounce usando Dexie (150ms para ser mais responsivo)
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      searchProducts(searchTerm, false);
    }, 150);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // Função para remover acentos (normalização)
  const removeAccents = (str: string): string => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  // Função auxiliar para aguardar com retry
  const waitForProducts = async (
    maxRetries: number = 8,
    initialDelay: number = 300
  ): Promise<Product[]> => {
    let delay = initialDelay;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const dbReady = await ensureDbReady();
        if (!dbReady) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay = Math.min(delay * 1.5, 2000); // Cap at 2 seconds
          continue;
        }

        const results = await db.products.limit(50).toArray();
        if (results.length > 0) {
          return results;
        }

        // Se não encontrou produtos, aguarda antes de tentar novamente
        // (provavelmente o sync ainda está em andamento)
        console.log(`Tentativa ${i + 1}/${maxRetries}: aguardando produtos...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(delay * 1.5, 2000); // Backoff exponencial com cap
      } catch (error) {
        console.error(`Tentativa ${i + 1}/${maxRetries} falhou:`, error);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(delay * 1.5, 2000);
      }
    }

    // Após todas as tentativas, retorna vazio (pode ser que realmente não haja produtos)
    return [];
  };

  const searchProducts = async (term: string, isInitial: boolean = false) => {
    try {
      const dbReady = await ensureDbReady();
      if (!dbReady) {
        console.log("Banco não está pronto para busca");
        return;
      }

      let results: Product[];
      const normalizedTerm = removeAccents(term.trim().toLowerCase());

      if (normalizedTerm === "") {
        if (isInitial) {
          // No carregamento inicial, aguarda o sync popular o banco
          results = await waitForProducts(8, 300);
        } else {
          // Limit to 50 items for initial view to avoid performance issues
          results = await db.products.limit(50).toArray();
        }
      } else {
        // Improved search: "Contains" instead of "StartsWith"
        // Also accent-insensitive: "cafe" finds "Café", "acucar" finds "Açúcar"
        results = await db.products
          .filter((product) => {
            const normalizedName = product.nome
              ? removeAccents(product.nome.toLowerCase())
              : "";
            const normalizedSku = product.sku
              ? removeAccents(product.sku.toString().toLowerCase())
              : "";

            const nameMatch = normalizedName.includes(normalizedTerm);
            const skuMatch = normalizedSku.includes(normalizedTerm);
            return nameMatch || skuMatch;
          })
          .limit(50)
          .toArray();
      }

      setSearchResults(results);
      // We don't necessarily update 'products' state anymore as we rely on search results.
      if (normalizedTerm === "") setProducts(results);
    } catch (error) {
      console.error("Erro ao buscar produtos localmente:", error);
      // Só exibe toast de erro se já temos produtos carregados (não é race condition)
      if (hasLoadedProducts.current && !isInitial) {
        toast({
          title: "Erro na busca",
          description: "Falha ao buscar produtos no banco local.",
          variant: "destructive",
        });
      }
    } finally {
      // Só desliga o loading inicial
      if (isInitial) {
        setInitialLoading(false);
      }
    }
  };

  const addToCart = (product: Product) => {
    // 1. Verifica se o produto tem estoque > 0
    if (product.estoqueAtual <= 0) {
      toast({
        title: "Estoque Indisponível",
        description: `O produto "${product.nome}" está sem estoque.`,
        variant: "destructive",
      });
      return;
    }

    // 2. Verifica se a quantidade no carrinho + 1 ultrapassa o estoque
    const existingItem = cart.find((item) => item.product.id === product.id);
    if (existingItem && existingItem.quantidade >= product.estoqueAtual) {
      toast({
        title: "Limite de Estoque",
        description: `Você já atingiu a quantidade máxima em estoque para este produto.`,
        variant: "destructive",
      });
      return;
    }

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

    const itemInCart = cart.find((item) => item.product.id === productId);
    if (itemInCart) {
      if (newQuantity > itemInCart.product.estoqueAtual) {
        toast({
          title: "Estoque Insuficiente",
          description: `A quantidade máxima disponível é ${itemInCart.product.estoqueAtual}.`,
          variant: "destructive",
        });
        // Atualiza para o máximo possível ao invés de ignorar, melhor UX
        newQuantity = itemInCart.product.estoqueAtual;
      }
    }

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

  // ==== MULTI-PAYMENT FUNCTIONS ====

  /**
   * Adiciona um pagamento à lista
   */
  const addPayment = useCallback(
    (method: PaymentItem["method"], amount: number) => {
      if (amount <= 0) {
        toast({
          title: "Valor inválido",
          description: "O valor do pagamento deve ser maior que zero.",
          variant: "destructive",
        });
        return false;
      }

      // Para métodos diferentes de dinheiro, não pode exceder o restante
      if (method !== "dinheiro" && amount > valorRestante + 0.01) {
        toast({
          title: "Valor excede o restante",
          description: `Para ${method}, o valor máximo é R$ ${valorRestante.toFixed(
            2
          )}.`,
          variant: "destructive",
        });
        return false;
      }

      const newPayment: PaymentItem = {
        id: `${method}-${Date.now()}`,
        method,
        amount,
      };

      setPayments((prev) => [...prev, newPayment]);
      return true;
    },
    [valorRestante]
  );

  /**
   * Remove um pagamento da lista
   */
  const removePayment = useCallback((paymentId: string) => {
    setPayments((prev) => prev.filter((p) => p.id !== paymentId));
  }, []);

  /**
   * Limpa todos os pagamentos
   */
  const clearPayments = useCallback(() => {
    setPayments([]);
  }, []);

  const clearCart = () => {
    setCart([]);
    setPayments([]);
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

    // Validar pagamentos
    if (payments.length === 0) {
      setPaymentError(true);
      toast({
        title: "Pagamento Obrigatório",
        description: "Adicione pelo menos um método de pagamento!",
        variant: "destructive",
      });
      setTimeout(() => setPaymentError(false), 3000);
      return;
    }

    // Validar se o pagamento cobre o total (considerando troco)
    const somaPagamentos = payments.reduce((acc, p) => acc + p.amount, 0);
    const valorEfetivo = somaPagamentos - trocoTotal;

    if (valorEfetivo < total - 0.01) {
      toast({
        title: "Pagamento insuficiente",
        description: `Faltam R$ ${(total - valorEfetivo).toFixed(
          2
        )} para cobrir o total.`,
        variant: "destructive",
      });
      return;
    }

    setFinalizing(true);
    setPaymentError(false);

    // Preparar payload com novo formato de pagamentos
    const paymentsPayload: PaymentInput[] = payments.map((p) => ({
      method: p.method,
      amount: p.amount,
    }));

    const salePayload = {
      items: cart.map((item) => ({
        productId: item.product.id,
        quantidade: item.quantidade,
        precoUnitario: item.product.precoVenda,
        descontoAplicado: item.descontoAplicado,
      })),
      payments: paymentsPayload,
      // Campos legacy para compatibilidade
      valorRecebido: somaPagamentos,
      troco: trocoTotal > 0 ? trocoTotal : null,
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

        // Atualizar estoque local para refletir na UI imediatamente
        for (const item of cart) {
          const product = await db.products.get(item.product.id);
          if (product) {
            await db.products.update(item.product.id, {
              estoqueAtual: Math.max(0, product.estoqueAtual - item.quantidade),
            });
          }
        }

        // Recarregar produtos para atualizar a UI
        const updatedProducts = await db.products.limit(50).toArray();
        setSearchResults(updatedProducts);
        setProducts(updatedProducts);

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
          timestamp: Date.now(),
        });

        toast({
          title: "Venda Salva Localmente",
          description: "Será enviada quando houver internet.",
          className: "bg-yellow-500 text-white", // Visual feedback
        });

        // Atualizar estoque local imediatamente para refletir na UI
        try {
          for (const item of cart) {
            const product = await db.products.get(item.product.id);
            if (product) {
              await db.products.update(item.product.id, {
                estoqueAtual: Math.max(
                  0,
                  product.estoqueAtual - item.quantidade
                ),
              });
            }
          }
          // Recarregar produtos para atualizar a UI
          const updatedProducts = await db.products.limit(50).toArray();
          setSearchResults(updatedProducts);
          setProducts(updatedProducts);
        } catch (localUpdateError) {
          console.error("Erro ao atualizar estoque local", localUpdateError);
        }
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

    // Determinar método de exibição
    if (payments.length > 1) {
      setLastPaymentMethod("COMBINADO");
    } else if (payments.length === 1) {
      setLastPaymentMethod(payments[0].method);
    } else {
      setLastPaymentMethod("");
    }

    setLastPayments([...payments]);
    setLastValorRecebido(somaPagamentos);
    setLastTroco(trocoTotal > 0 ? trocoTotal : null);

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
    loading: initialLoading,
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
    // ==== MULTI-PAYMENT ====
    payments,
    setPayments,
    addPayment,
    removePayment,
    clearPayments,
    totalPago,
    valorRestante,
    trocoTotal,
    lastPayments,
    total,
  };
}
