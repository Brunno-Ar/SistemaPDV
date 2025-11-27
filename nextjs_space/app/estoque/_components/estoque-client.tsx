
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Package } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface Product {
  id: string
  nome: string
  sku: string
  precoVenda: number
  precoCompra: number
  estoqueAtual: number
  estoqueMinimo: number
  imagemUrl?: string | null
  createdAt: string
  updatedAt: string
}

interface EstoqueClientProps {
  companyId?: string // Opcional: usado pelo Master para visualizar empresa específica
}

export default function EstoqueClient({ companyId }: EstoqueClientProps = {}) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    sku: '',
    precoVenda: '',
    precoCompra: '',
    estoqueAtual: '',
    estoqueMinimo: '',
    imagemUrl: '',
    loteInicial: '',
    validadeInicial: ''
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imagePreview, setImagePreview] = useState<string>('')

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      // 🔥 Se companyId for fornecido, incluir na query
      const url = companyId 
        ? `/api/admin/products?companyId=${companyId}` 
        : '/api/admin/products'
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar produtos')
      }
      
      // Ensure data is an array
      if (Array.isArray(data)) {
        setProducts(data)
      } else {
        setProducts([])
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
      setProducts([])
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao carregar produtos',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product)
      setFormData({
        nome: product.nome,
        sku: product.sku,
        precoVenda: product.precoVenda.toString(),
        precoCompra: product.precoCompra.toString(),
        estoqueAtual: product.estoqueAtual.toString(),
        estoqueMinimo: product.estoqueMinimo.toString(),
        imagemUrl: product.imagemUrl || '',
        loteInicial: '',
        validadeInicial: ''
      })
      setImagePreview('')
      setSelectedFile(null)
    } else {
      setEditingProduct(null)
      setFormData({
        nome: '',
        sku: '',
        precoVenda: '',
        precoCompra: '',
        estoqueAtual: '0',
        estoqueMinimo: '5',
        imagemUrl: '',
        loteInicial: '0',
        validadeInicial: ''
      })
      setImagePreview('')
      setSelectedFile(null)
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingProduct(null)
    setFormData({
      nome: '',
      sku: '',
      precoVenda: '',
      precoCompra: '',
      estoqueAtual: '',
      estoqueMinimo: '',
      imagemUrl: '',
      loteInicial: '',
      validadeInicial: ''
    })
    setSelectedFile(null)
    setImagePreview('')
  }

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      handleCloseDialog()
    } else {
      setDialogOpen(true)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadImage = async (): Promise<string | null> => {
    if (!selectedFile) return null

    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao fazer upload da imagem')
      }

      return data.cloud_storage_path
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao fazer upload da imagem',
        variant: 'destructive'
      })
      return null
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validação: ao editar, estoqueAtual é obrigatório
    if (!formData.nome || !formData.precoVenda || !formData.precoCompra) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive'
      })
      return
    }

    if (editingProduct && !formData.estoqueAtual) {
      toast({
        title: 'Erro',
        description: 'Estoque atual é obrigatório ao editar produto',
        variant: 'destructive'
      })
      return
    }

    const precoVenda = parseFloat(formData.precoVenda)
    const precoCompra = parseFloat(formData.precoCompra)
    const estoqueAtual = formData.estoqueAtual ? parseInt(formData.estoqueAtual) : 0
    const estoqueMinimo = parseInt(formData.estoqueMinimo) || 5

    if (precoVenda <= 0 || precoCompra < 0) {
      toast({
        title: 'Erro',
        description: 'Preços devem ser válidos (preço de venda > 0)',
        variant: 'destructive'
      })
      return
    }

    if (precoCompra > precoVenda) {
      toast({
        title: 'Aviso',
        description: 'Preço de compra maior que preço de venda. Você terá prejuízo nas vendas.',
        variant: 'default'
      })
    }

    if (estoqueAtual < 0) {
      toast({
        title: 'Erro',
        description: 'Estoque não pode ser negativo',
        variant: 'destructive'
      })
      return
    }

    try {
      // Upload da imagem se houver arquivo selecionado
      let imagemUrl = formData.imagemUrl
      if (selectedFile) {
        const uploadedUrl = await uploadImage()
        if (uploadedUrl) {
          imagemUrl = uploadedUrl
        }
      }

      // 🔥 Incluir companyId na URL se fornecido
      let url = editingProduct ? `/api/admin/products/${editingProduct.id}` : '/api/admin/products'
      if (companyId) {
        url += `?companyId=${companyId}`
      }
      const method = editingProduct ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome: formData.nome,
          sku: editingProduct ? formData.sku : '', // SKU vazio para criar (será gerado automaticamente)
          precoVenda,
          precoCompra,
          estoqueAtual,
          estoqueMinimo,
          imagemUrl: imagemUrl || null,
          loteInicial: formData.loteInicial ? parseInt(formData.loteInicial) : undefined,
          validadeInicial: formData.validadeInicial || undefined
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao salvar produto')
      }

      toast({
        title: 'Sucesso',
        description: editingProduct ? 'Produto atualizado com sucesso' : 'Produto criado com sucesso',
      })

      handleCloseDialog()
      fetchProducts()
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao salvar produto',
        variant: 'destructive'
      })
    }
  }

  const handleDelete = async (productId: string) => {
    try {
      // 🔥 Incluir companyId na URL se fornecido
      let url = `/api/admin/products/${productId}`
      if (companyId) {
        url += `?companyId=${companyId}`
      }
      
      const response = await fetch(url, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao excluir produto')
      }

      toast({
        title: 'Sucesso',
        description: 'Produto excluído com sucesso',
      })

      fetchProducts()
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao excluir produto',
        variant: 'destructive'
      })
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando produtos...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header com botão Adicionar */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Produtos em Estoque</CardTitle>
            <p className="text-sm text-gray-600">{products.length} produtos cadastrados</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Produto
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? 'Editar Produto' : 'Adicionar Novo Produto'}
                </DialogTitle>
                <DialogDescription>
                  {editingProduct ? 'Atualize as informações do produto' : 'Preencha os dados do novo produto'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome do Produto</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Nome do produto"
                    required
                  />
                  <p className="text-xs text-gray-500">
                    ℹ️ O SKU será gerado automaticamente ao criar o produto
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="precoCompra">Preço de Compra (R$)</Label>
                  <Input
                    id="precoCompra"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.precoCompra}
                    onChange={(e) => setFormData({ ...formData, precoCompra: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="precoVenda">Preço de Venda (R$)</Label>
                  <Input
                    id="precoVenda"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.precoVenda}
                    onChange={(e) => setFormData({ ...formData, precoVenda: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>

                {/* Campo Estoque Atual (apenas ao editar) */}
                {editingProduct && (
                  <div className="space-y-2">
                    <Label htmlFor="estoqueAtual">Estoque Atual</Label>
                    <Input
                      id="estoqueAtual"
                      type="number"
                      min="0"
                      value={formData.estoqueAtual}
                      onChange={(e) => setFormData({ ...formData, estoqueAtual: e.target.value })}
                      placeholder="Quantidade em estoque"
                      required
                    />
                    <p className="text-xs text-gray-500">
                      ℹ️ Para ajustar estoque, use a seção "Lotes" ou "Movimentações"
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="estoqueMinimo">Estoque Mínimo</Label>
                  <Input
                    id="estoqueMinimo"
                    type="number"
                    min="0"
                    value={formData.estoqueMinimo}
                    onChange={(e) => setFormData({ ...formData, estoqueMinimo: e.target.value })}
                    placeholder="Quantidade mínima"
                  />
                  <p className="text-xs text-gray-500">
                    ⚠️ Você será alertado quando o estoque atingir este valor
                  </p>
                </div>

                {/* 🆕 SEÇÃO: ESTOQUE INICIAL (PRIMEIRO LOTE) */}
                {!editingProduct && (
                  <div className="space-y-4 p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                    <div className="flex items-center space-x-2">
                      <Package className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold text-blue-900">Estoque Inicial (Primeiro Lote)</h3>
                    </div>
                    <p className="text-sm text-gray-700">
                      📦 <strong>Cadastro Unificado:</strong> Crie o produto e seu primeiro lote em uma única etapa!
                    </p>

                    <div className="space-y-2">
                      <Label htmlFor="loteInicial">Quantidade do Lote</Label>
                      <Input
                        id="loteInicial"
                        type="number"
                        min="0"
                        value={formData.loteInicial}
                        onChange={(e) => setFormData({ ...formData, loteInicial: e.target.value })}
                        placeholder="0"
                      />
                      <p className="text-xs text-gray-500">
                        💡 Se informar quantidade &gt; 0, o estoque inicial será definido automaticamente
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="validadeInicial">Data de Validade</Label>
                      <Input
                        id="validadeInicial"
                        type="date"
                        value={formData.validadeInicial}
                        onChange={(e) => setFormData({ ...formData, validadeInicial: e.target.value })}
                        min={new Date().toISOString().split('T')[0]}
                      />
                      <p className="text-xs text-gray-500">
                        📅 Obrigatória se houver quantidade no lote
                      </p>
                    </div>

                    <div className="bg-white p-3 rounded border border-blue-300">
                      <p className="text-sm text-gray-700">
                        <strong>Como funciona:</strong> Ao criar o produto com lote inicial, você economiza tempo ao não 
                        precisar cadastrar o lote em outra tela. O número do lote será gerado automaticamente.
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="imagem">Foto do Produto (Opcional)</Label>
                  <Input
                    id="imagem"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                    onChange={handleFileChange}
                  />
                  <p className="text-xs text-gray-500">Formatos: JPEG, PNG, WebP, GIF. Tamanho máximo: 5MB</p>
                  
                  {/* Preview da imagem */}
                  {(imagePreview || (editingProduct?.imagemUrl && !selectedFile)) && (
                    <div className="mt-2">
                      <p className="text-sm font-medium mb-2">Preview:</p>
                      <div className="relative w-32 h-32 border rounded-md overflow-hidden">
                        <img
                          src={imagePreview || ''}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={uploadingImage}>
                    {uploadingImage ? 'Enviando...' : editingProduct ? 'Salvar Alterações' : 'Criar Produto'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
      </Card>

      {/* Tabela de Produtos */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Preço de Compra</TableHead>
                <TableHead>Preço de Venda</TableHead>
                <TableHead>Lucro Unit.</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-gray-500">Nenhum produto cadastrado</p>
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => {
                  const lucro = product.precoVenda - product.precoCompra
                  const margemLucro = product.precoCompra > 0 ? (lucro / product.precoCompra) * 100 : 0
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.nome}</TableCell>
                      <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                      <TableCell>R$ {product.precoCompra.toFixed(2)}</TableCell>
                      <TableCell>R$ {product.precoVenda.toFixed(2)}</TableCell>
                      <TableCell>
                        <span className={lucro >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                          R$ {lucro.toFixed(2)} ({margemLucro.toFixed(1)}%)
                        </span>
                      </TableCell>
                      <TableCell>{product.estoqueAtual} un.</TableCell>
                    <TableCell>
                      <Badge variant={product.estoqueAtual > 0 ? 'default' : 'destructive'}>
                        {product.estoqueAtual > 0 ? 'Em Estoque' : 'Sem Estoque'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenDialog(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir Produto</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o produto "{product.nome}"? 
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(product.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
