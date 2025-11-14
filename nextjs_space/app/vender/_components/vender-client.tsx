
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, ShoppingCart, Plus, Minus, Trash2, DollarSign, Package } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

// Componente para exibir imagem do produto com URL assinada
function ProductImage({ imagemUrl, nome }: { imagemUrl: string, nome: string }) {
  const [signedUrl, setSignedUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchSignedUrl() {
      try {
        const response = await fetch(`/api/products/image?key=${encodeURIComponent(imagemUrl)}`)
        const data = await response.json()
        
        if (response.ok && data.url) {
          setSignedUrl(data.url)
        } else {
          setError(true)
        }
      } catch (err) {
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchSignedUrl()
  }, [imagemUrl])

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="animate-pulse">
          <Package className="h-12 w-12 text-gray-300" />
        </div>
      </div>
    )
  }

  if (error || !signedUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <Package className="h-12 w-12 text-gray-300" />
      </div>
    )
  }

  return (
    <Image
      src={signedUrl}
      alt={nome}
      fill
      className="object-cover"
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    />
  )
}

interface Product {
  id: string
  nome: string
  sku: string
  precoVenda: number
  estoqueAtual: number
  imagemUrl?: string | null
}

interface CartItem {
  product: Product
  quantidade: number
  subtotal: number
}

export default function VenderClient() {
  const { data: session } = useSession()
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [metodoPagamento, setMetodoPagamento] = useState('')
  const [loading, setLoading] = useState(true)
  const [finalizing, setFinalizing] = useState(false)

  // Carregar produtos
  useEffect(() => {
    fetchProducts()
  }, [])

  // Filtrar produtos por nome
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredProducts(products)
    } else {
      setFilteredProducts(
        products.filter(product =>
          product.nome.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }
  }, [searchTerm, products])

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar produtos')
      }
      
      // Ensure data is an array
      if (Array.isArray(data)) {
        setProducts(data)
        setFilteredProducts(data)
      } else {
        setProducts([])
        setFilteredProducts([])
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
      setProducts([])
      setFilteredProducts([])
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao carregar produtos',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const addToCart = (product: Product) => {
    // Verificar se há estoque suficiente
    const existingItem = cart.find(item => item.product.id === product.id)
    const currentQuantity = existingItem?.quantidade || 0
    
    if (currentQuantity >= product.estoqueAtual) {
      toast({
        title: 'Estoque insuficiente',
        description: `Produto ${product.nome} não tem estoque suficiente`,
        variant: 'destructive'
      })
      return
    }

    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(item => item.product.id === product.id)
      
      if (existingItemIndex >= 0) {
        // Atualizar quantidade existente
        const newCart = [...prevCart]
        newCart[existingItemIndex] = {
          ...newCart[existingItemIndex],
          quantidade: newCart[existingItemIndex].quantidade + 1,
          subtotal: (newCart[existingItemIndex].quantidade + 1) * product.precoVenda
        }
        return newCart
      } else {
        // Adicionar novo item
        return [...prevCart, {
          product,
          quantidade: 1,
          subtotal: product.precoVenda
        }]
      }
    })
  }

  const updateCartItemQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId)
      return
    }

    const product = products.find(p => p.id === productId)
    if (!product) return

    if (newQuantity > product.estoqueAtual) {
      toast({
        title: 'Estoque insuficiente',
        description: `Máximo disponível: ${product.estoqueAtual}`,
        variant: 'destructive'
      })
      return
    }

    setCart(prevCart =>
      prevCart.map(item =>
        item.product.id === productId
          ? {
              ...item,
              quantidade: newQuantity,
              subtotal: newQuantity * item.product.precoVenda
            }
          : item
      )
    )
  }

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId))
  }

  const clearCart = () => {
    setCart([])
    setMetodoPagamento('')
  }

  const valorTotal = cart.reduce((total, item) => total + item.subtotal, 0)

  const finalizarVenda = async () => {
    if (cart.length === 0) {
      toast({
        title: 'Carrinho vazio',
        description: 'Adicione produtos ao carrinho antes de finalizar',
        variant: 'destructive'
      })
      return
    }

    if (!metodoPagamento) {
      toast({
        title: 'Método de pagamento',
        description: 'Selecione um método de pagamento',
        variant: 'destructive'
      })
      return
    }

    setFinalizing(true)

    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: cart.map(item => ({
            productId: item.product.id,
            quantidade: item.quantidade,
            precoUnitario: item.product.precoVenda
          })),
          metodoPagamento,
          valorTotal
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao finalizar venda')
      }

      toast({
        title: 'Venda finalizada!',
        description: `Venda de R$ ${valorTotal.toFixed(2)} finalizada com sucesso`,
      })

      clearCart()
      fetchProducts() // Recarregar produtos para atualizar estoque
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao finalizar venda',
        variant: 'destructive'
      })
    } finally {
      setFinalizing(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando produtos...</div>
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Coluna Esquerda - Grid de Produtos (60%) */}
      <div className="lg:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle>Produtos Disponíveis</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar produtos por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            {filteredProducts.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Nenhum produto encontrado</p>
                <p className="text-sm">
                  {searchTerm ? 'Tente buscar com outros termos' : 'Cadastre produtos no estoque para começar'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredProducts.map((product) => (
                  <Card
                    key={product.id}
                    className="cursor-pointer hover:shadow-md transition-shadow border border-gray-200 hover:border-blue-300 overflow-hidden"
                    onClick={() => addToCart(product)}
                  >
                    {product.imagemUrl && (
                      <div className="relative w-full aspect-video bg-gray-100">
                        <ProductImage imagemUrl={product.imagemUrl} nome={product.nome} />
                      </div>
                    )}
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <h3 className="font-medium text-sm">{product.nome}</h3>
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold text-green-600">
                            R$ {product.precoVenda.toFixed(2)}
                          </span>
                          <Badge variant={product.estoqueAtual > 0 ? 'default' : 'destructive'}>
                            {product.estoqueAtual > 0 ? `${product.estoqueAtual} un.` : 'Sem estoque'}
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
        <Card className="sticky top-20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
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
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.product.nome}</p>
                        <p className="text-xs text-gray-600">R$ {item.product.precoVenda.toFixed(2)} / un.</p>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateCartItemQuantity(item.product.id, item.quantidade - 1)}
                          className="h-8 w-8 p-0"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="min-w-[2rem] text-center text-sm font-medium">
                          {item.quantidade}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateCartItemQuantity(item.product.id, item.quantidade + 1)}
                          className="h-8 w-8 p-0"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="text-right">
                        <p className="font-semibold text-sm">R$ {item.subtotal.toFixed(2)}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFromCart(item.product.id)}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Método de Pagamento */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Método de Pagamento</label>
                  <Select value={metodoPagamento} onValueChange={setMetodoPagamento}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o método" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="debito">Cartão de Débito</SelectItem>
                      <SelectItem value="credito">Cartão de Crédito</SelectItem>
                      <SelectItem value="pix">PIX</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Valor Total */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-green-600">R$ {valorTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="space-y-2">
                  <Button
                    onClick={finalizarVenda}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    disabled={finalizing}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    {finalizing ? 'Finalizando...' : 'Finalizar Venda'}
                  </Button>
                  
                  <Button
                    onClick={clearCart}
                    variant="outline"
                    className="w-full"
                    disabled={finalizing}
                  >
                    Limpar Carrinho
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
