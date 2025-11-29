"use client";

import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  DollarSign,
  Package,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { MessageLoading } from "@/components/ui/message-loading";
import SaleCompletedScreen from "./sale-completed-screen";

// Componente para exibir imagem do produto
function ProductImage({
  imagemUrl,
  nome,
}: {
  imagemUrl: string;
  nome: string;
}) {
  if (!imagemUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <Package className="h-12 w-12 text-gray-300" />
      </div>
    );
  }

  return (
    <Image
      src={imagemUrl}
      alt={nome}
      fill
      className="object-cover"
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    />
  );
}

interface Product {
  id: string;
  nome: string;
  sku: string;
  precoVenda: number;
  estoqueAtual: number;
  imagemUrl?: string | null;
}

interface CartItem {
  product: Product;
  quantidade: number;
  descontoAplicado: number;
  subtotal: number;
}

export default function VenderClient() {
  const { data: session } = useSession();
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

  const [isOffline, setIsOffline] = useState(false);

  // Carregar dados do localStorage e configurar listeners de rede
  useEffect(() => {
    // 1. Carregar carrinho salvo
    const savedCart = localStorage.getItem("pdv_cart");
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error("Erro ao carregar carrinho salvo:", e);
      }
    }

    // 2. Carregar método de pagamento salvo
    const savedPayment = localStorage.getItem("pdv_payment_method");
    if (savedPayment) {
      setMetodoPagamento(savedPayment);
    }

    // 3. Configurar detecção de offline/online
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Definir estado inicial
    setIsOffline(!navigator.onLine);

    fetchProducts();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Salvar carrinho no localStorage sempre que mudar
  useEffect(() => {
    localStorage.setItem("pdv_cart", JSON.stringify(cart));
  }, [cart]);

  // Salvar método de pagamento no localStorage sempre que mudar
  useEffect(() => {
    localStorage.setItem("pdv_payment_method", metodoPagamento);
  }, [metodoPagamento]);

  // Filtrar produtos por nome
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredProducts(products);
    } else {
      setFilteredProducts(
        products.filter((product) =>
          product.nome.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
  }, [searchTerm, products]);

  const fetchProducts = async () => {
    if (!navigator.onLine) {
      // Se estiver offline, tentar carregar produtos do cache local se existir (opcional)
      // Por enquanto, apenas não faz nada ou mostra aviso
      return;
    }

    try {
      const response = await fetch("/api/products");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao carregar produtos");
      }

      // Ensure data is an array
      if (Array.isArray(data)) {
        setProducts(data);
        setFilteredProducts(data);
        // Salvar produtos em cache local para uso offline futuro (opcional, mas recomendado)
        localStorage.setItem("pdv_products_cache", JSON.stringify(data));
      } else {
        setProducts([]);
        setFilteredProducts([]);
      }
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);

      // Tentar recuperar do cache se falhar
      const cachedProducts = localStorage.getItem("pdv_products_cache");
      if (cachedProducts) {
        try {
          const parsed = JSON.parse(cachedProducts);
          setProducts(parsed);
          setFilteredProducts(parsed);
          toast({
            title: "Modo Offline",
            description: "Carregando produtos do cache local.",
            variant: "default",
          });
          return;
        } catch (e) {
          console.error("Erro ao ler cache de produtos", e);
        }
      }

      setProducts([]);
      setFilteredProducts([]);
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Erro ao carregar produtos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    // Verificar se há estoque suficiente
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
        // Atualizar quantidade existente
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
        // Adicionar novo item
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

    const product = products.find((p) => p.id === productId);
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

  const valorTotal = cart.reduce((total, item) => total + item.subtotal, 0);

  const finalizarVenda = async () => {
    if (isOffline) {
      toast({
        title: "Sem conexão",
        description:
          "Não é possível finalizar vendas offline. Aguarde a conexão retornar.",
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

    // 🔥 VALIDAÇÃO DE PAGAMENTO com highlight visual
    if (!metodoPagamento) {
      setPaymentError(true);
      toast({
        title: "Forma de Pagamento Obrigatória",
        description: "Selecione a Forma de Pagamento antes de finalizar!",
        variant: "destructive",
      });

      // Remover highlight após 3 segundos
      setTimeout(() => {
        setPaymentError(false);
      }, 3000);

      return;
    }

    setFinalizing(true);
    setPaymentError(false);

    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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

      if (!response.ok) {
        throw new Error(data.error || "Erro ao finalizar venda");
      }

      // Sucesso!
      setLastSaleTotal(valorTotal);
      setShowSuccessScreen(true);

      // Limpar dados do localStorage mas manter estado local até clicar em "Nova Venda"
      localStorage.removeItem("pdv_cart");
      localStorage.removeItem("pdv_payment_method");

      fetchProducts(); // Recarregar produtos para atualizar estoque em background
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

  if (showSuccessScreen) {
    return (
      <SaleCompletedScreen
        total={lastSaleTotal}
        paymentMethod={metodoPagamento}
        onNewSale={handleNewSale}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <MessageLoading />
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:grid lg:grid-cols-5 lg:gap-6 lg:space-y-0 relative">
      {/* Overlay de Finalização */}
      {finalizing && (
        <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
          <div className="bg-white p-6 rounded-xl shadow-xl border flex flex-col items-center gap-4">
            <MessageLoading />
            <p className="font-medium text-lg text-gray-700">
              Processando Venda...
            </p>
          </div>
        </div>
      )}

      {/* Coluna Esquerda - Grid de Produtos (60%) */}
      <div className="lg:col-span-3">
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg sm:text-xl">
                Produtos Disponíveis
              </CardTitle>
              {isOffline && (
                <Badge variant="destructive" className="animate-pulse">
                  Sem Conexão (Offline)
                </Badge>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            {filteredProducts.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                <Package className="h-12 sm:h-16 w-12 sm:w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-base sm:text-lg font-medium">
                  Nenhum produto encontrado
                </p>
                <p className="text-xs sm:text-sm mt-2">
                  {searchTerm
                    ? "Tente buscar com outros termos"
                    : "Cadastre produtos no estoque para começar"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                {filteredProducts.map((product) => (
                  <Card
                    key={product.id}
                    className="cursor-pointer hover:shadow-md transition-shadow border border-gray-200 hover:border-blue-300 overflow-hidden"
                    onClick={() => addToCart(product)}
                  >
                    {product.imagemUrl && (
                      <div className="relative w-full aspect-video bg-gray-100">
                        <ProductImage
                          imagemUrl={product.imagemUrl}
                          nome={product.nome}
                        />
                      </div>
                    )}
                    <CardContent className="p-3 sm:p-4">
                      <div className="space-y-2">
                        <h3 className="font-medium text-xs sm:text-sm line-clamp-2">
                          {product.nome}
                        </h3>
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-base sm:text-lg font-bold text-green-600">
                            R$ {product.precoVenda.toFixed(2)}
                          </span>
                          <Badge
                            variant={
                              product.estoqueAtual > 0
                                ? "default"
                                : "destructive"
                            }
                            className="text-xs"
                          >
                            {product.estoqueAtual > 0
                              ? `${product.estoqueAtual} un.`
                              : "Sem estoque"}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-500">
                          SKU: {product.sku}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Coluna Direita - Carrinho (40%) */}
      <div className="lg:col-span-2">
        <Card className="lg:sticky lg:top-20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <ShoppingCart className="h-5 w-5" />
              Carrinho de Vendas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cart.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <ShoppingCart className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>Carrinho vazio</p>
                <p className="text-sm">Clique nos produtos para adicionar</p>
              </div>
            ) : (
              <>
                {/* Lista de Itens */}
                <div className="space-y-3 max-h-60 lg:max-h-80 overflow-y-auto">
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="p-3 bg-gray-50 rounded-lg space-y-2"
                    >
                      {/* Linha 1: Nome e Remover */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs sm:text-sm truncate">
                            {item.product.nome}
                          </p>
                          <p className="text-xs text-gray-600">
                            R$ {item.product.precoVenda.toFixed(2)} / un.
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFromCart(item.product.id)}
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Linha 2: Quantidade e Desconto */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-xs text-gray-600">
                            Quantidade
                          </label>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                updateCartItemQuantity(
                                  item.product.id,
                                  item.quantidade - 1
                                )
                              }
                              className="h-7 w-7 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="min-w-[2rem] text-center text-xs sm:text-sm font-medium">
                              {item.quantidade}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                updateCartItemQuantity(
                                  item.product.id,
                                  item.quantidade + 1
                                )
                              }
                              className="h-7 w-7 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-gray-600">
                            Desconto (R$)
                          </label>
                          <Input
                            type="number"
                            min="0"
                            max={item.quantidade * item.product.precoVenda}
                            step="0.01"
                            value={item.descontoAplicado}
                            onChange={(e) =>
                              updateCartItemDesconto(
                                item.product.id,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="h-7 text-xs"
                          />
                        </div>
                      </div>

                      {/* Linha 3: Subtotal */}
                      <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                        <span className="text-xs text-gray-600">Subtotal:</span>
                        <span className="font-semibold text-sm text-green-600">
                          R$ {item.subtotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Método de Pagamento */}
                <div className="space-y-2">
                  <label
                    className={`text-xs sm:text-sm font-medium ${
                      paymentError ? "text-red-600" : ""
                    }`}
                  >
                    Método de Pagamento{" "}
                    {paymentError && <span className="text-red-600">*</span>}
                  </label>
                  <Select
                    value={metodoPagamento}
                    onValueChange={(value) => {
                      setMetodoPagamento(value);
                      setPaymentError(false); // Limpar erro ao selecionar
                    }}
                  >
                    <SelectTrigger
                      className={`text-sm ${
                        paymentError
                          ? "border-red-500 border-2 ring-2 ring-red-200 animate-shake"
                          : ""
                      }`}
                    >
                      <SelectValue placeholder="Selecione o método" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="debito">Cartão de Débito</SelectItem>
                      <SelectItem value="credito">Cartão de Crédito</SelectItem>
                      <SelectItem value="pix">PIX</SelectItem>
                    </SelectContent>
                  </Select>
                  {paymentError && (
                    <p className="text-xs text-red-600 font-medium">
                      ⚠️ Selecione uma forma de pagamento
                    </p>
                  )}
                </div>

                {/* Valor Total */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-base sm:text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-green-600">
                      R$ {valorTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="space-y-2">
                  <InteractiveHoverButton
                    onClick={finalizarVenda}
                    className="w-full bg-green-600 hover:bg-green-700 text-white text-sm sm:text-base border-green-600"
                    disabled={finalizing || isOffline}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      {finalizing
                        ? "Finalizando..."
                        : isOffline
                        ? "Sem Conexão"
                        : "Finalizar Venda"}
                    </span>
                  </InteractiveHoverButton>
                  <InteractiveHoverButton
                    onClick={clearCart}
                    className="w-full text-sm sm:text-base border-gray-200 hover:bg-gray-100 text-gray-800"
                    disabled={finalizing}
                  >
                    Limpar Carrinho
                  </InteractiveHoverButton>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
