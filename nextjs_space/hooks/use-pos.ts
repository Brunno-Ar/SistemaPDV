import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "@/hooks/use-toast";

export interface Product {
  id: string;
  nome: string;
  sku: string;
  precoVenda: number;
  estoqueAtual: number;
  imagemUrl?: string | null;
}

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
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [paymentError, setPaymentError] = useState(false);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [lastSaleTotal, setLastSaleTotal] = useState(0);
  const [lastPaymentMethod, setLastPaymentMethod] = useState("");
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

    fetchProducts();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Persistência
  useEffect(() => {
    localStorage.setItem("pdv_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem("pdv_payment_method", metodoPagamento);
  }, [metodoPagamento]);

  // Busca com Debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.trim() === "") {
        setFilteredProducts(products);
        return;
      }

      try {
        const response = await fetch(
          `/api/products/search?query=${encodeURIComponent(searchTerm)}`
        );
        const data = await response.json();

        if (response.ok && Array.isArray(data)) {
          setFilteredProducts(data);
        } else {
          setFilteredProducts(
            products.filter((product) =>
              product.nome.toLowerCase().includes(searchTerm.toLowerCase())
            )
          );
        }
      } catch (error) {
        console.error("Erro na busca rápida:", error);
        setFilteredProducts(
          products.filter((product) =>
            product.nome.toLowerCase().includes(searchTerm.toLowerCase())
          )
        );
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, products]);

  const fetchProducts = async () => {
    if (!navigator.onLine) return;

    try {
      const response = await fetch("/api/products");
      const data = await response.json();

      if (!response.ok)
        throw new Error(data.error || "Erro ao carregar produtos");

      if (Array.isArray(data)) {
        setProducts(data);
        if (searchTerm.trim() === "") setFilteredProducts(data);
        localStorage.setItem("pdv_products_cache", JSON.stringify(data));
      } else {
        setProducts([]);
        if (searchTerm.trim() === "") setFilteredProducts([]);
      }
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      const cachedProducts = localStorage.getItem("pdv_products_cache");
      if (cachedProducts) {
        try {
          const parsed = JSON.parse(cachedProducts);
          setProducts(parsed);
          if (searchTerm.trim() === "") setFilteredProducts(parsed);
          toast({
            title: "Modo Offline",
            description: "Carregando produtos do cache local.",
            variant: "default",
          });
          return;
        } catch (e) {}
      }
      setProducts([]);
      setFilteredProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product) => {
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

    const productInList = products.find((p) => p.id === productId);
    const itemInCart = cart.find((i) => i.product.id === productId);
    const product = productInList || itemInCart?.product;

    if (!product) return;

    if (newQuantity > product.estoqueAtual) {
      toast({
        title: "Estoque insuficiente",
        description: `Máximo disponível: ${product.estoqueAtual}`,
        variant: "destructive",
      });
      return;
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
    localStorage.removeItem("pdv_cart");
    localStorage.removeItem("pdv_payment_method");
  };

  const finalizarVenda = async () => {
    if (isOffline) {
      toast({
        title: "Sem conexão",
        description: "Não é possível finalizar vendas offline.",
        variant: "destructive",
      });
      return;
    }

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

    setFinalizing(true);
    setPaymentError(false);

    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: item.product.id,
            quantidade: item.quantidade,
            precoUnitario: item.product.precoVenda,
            descontoAplicado: item.descontoAplicado,
          })),
          metodoPagamento,
        }),
      });

      const data = await response.json();

      if (!response.ok)
        throw new Error(data.error || "Erro ao finalizar venda");

      const total = cart.reduce((acc, item) => acc + item.subtotal, 0);
      setLastSaleTotal(total);
      setLastPaymentMethod(metodoPagamento); // Salvar método para tela de sucesso
      setShowSuccessScreen(true);
      clearCart();
      fetchProducts();
    } catch (error) {
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Erro ao finalizar venda",
        variant: "destructive",
      });
    } finally {
      setFinalizing(false);
    }
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
    lastPaymentMethod, // Exportar o estado
  };
}
