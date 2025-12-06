import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [sortOption, setSortOption] = useState<string>("name_asc");

  // Ordenação Reativa com useMemo
  const filteredProducts = useMemo(() => {
    let sorted = [...searchResults];

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
  const [metodoPagamento, setMetodoPagamento] = useState("");
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
    searchProducts("", true);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Persistência
  useEffect(() => {
    localStorage.setItem("pdv_cart", JSON.stringify(cart));
  }, [cart]);

  const total = useMemo(
    () => cart.reduce((acc, item) => acc + item.subtotal, 0),
    [cart]
  );

  useEffect(() => {
    localStorage.setItem("pdv_payment_method", metodoPagamento);
    // Se mudar para dinheiro ou o total mudar, preenche automaticamente com o total
    if (metodoPagamento === "dinheiro") {
      setValorRecebido(total.toFixed(2).replace(".", ","));
    } else {
      setValorRecebido("");
    }
  }, [metodoPagamento, total]);

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
    maxRetries: number = 5,
    initialDelay: number = 500
  ): Promise<Product[]> => {
    let delay = initialDelay;
    for (let i = 0; i < maxRetries; i++) {
      const results = await db.products.limit(50).toArray();
      if (results.length > 0) {
        return results;
      }
      // Se não encontrou produtos, aguarda antes de tentar novamente
      // (provavelmente o sync ainda está em andamento)
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 1.5; // Backoff exponencial suave
    }
    // Após todas as tentativas, retorna vazio (pode ser que realmente não haja produtos)
    return [];
  };

  const searchProducts = async (term: string, isInitial: boolean = false) => {
    try {
      // Só mostra loading no carregamento inicial, não durante pesquisa
      // Isso evita o "piscar" da tela durante digitação
      let results: Product[];
      const normalizedTerm = removeAccents(term.trim().toLowerCase());

      if (normalizedTerm === "") {
        if (isInitial) {
          // No carregamento inicial, aguarda o sync popular o banco
          results = await waitForProducts(5, 500);
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
      // Só exibe toast de erro se não for carregamento inicial
      // (durante o inicial, pode ser race condition com o sync)
      if (!isInitial) {
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
          description:
            "O valor recebido deve ser maior ou igual ao total da venda.",
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
                estoqueAtual: product.estoqueAtual - item.quantidade,
              });
            }
          }
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
  };
}
