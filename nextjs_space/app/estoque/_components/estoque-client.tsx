
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
  estoqueAtual: number
  estoqueMinimo: number
  imagemUrl?: string | null
  createdAt: string
  updatedAt: string
}

export default function EstoqueClient() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    sku: '',
    precoVenda: '',
    estoqueAtual: '',
    estoqueMinimo: '',
    imagemUrl: ''
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imagePreview, setImagePreview] = useState<string>('')

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/admin/products')
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
        estoqueAtual: product.estoqueAtual.toString(),
        estoqueMinimo: product.estoqueMinimo.toString(),
        imagemUrl: product.imagemUrl || ''
      })
      setImagePreview('')
      setSelectedFile(null)
    } else {
      setEditingProduct(null)
      setFormData({
        nome: '',
        sku: '',
        precoVenda: '',
        estoqueAtual: '',
        estoqueMinimo: '',
        imagemUrl: ''
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
      estoqueAtual: '',
      estoqueMinimo: '',
      imagemUrl: ''
    })
    setSelectedFile(null)
    setImagePreview('')
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

    if (!formData.nome || !formData.sku || !formData.precoVenda || !formData.estoqueAtual) {
      toast({
        title: 'Erro',
        description: 'Todos os campos são obrigatórios',
        variant: 'destructive'
      })
      return
    }

    const precoVenda = parseFloat(formData.precoVenda)
    const estoqueAtual = parseInt(formData.estoqueAtual)

    if (precoVenda <= 0) {
      toast({
        title: 'Erro',
        description: 'Preço deve ser maior que zero',
        variant: 'destructive'
      })
      return
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

      const url = editingProduct ? `/api/admin/products/${editingProduct.id}` : '/api/admin/products'
      const method = editingProduct ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome: formData.nome,
          sku: formData.sku,
          precoVenda,
          estoqueAtual,
          imagemUrl: imagemUrl || null
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
      const response = await fetch(`/api/admin/products/${productId}`, {
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
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Produto
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? 'Editar Produto' : 'Adicionar Novo Produto'}
                </DialogTitle>
                <DialogDescription>
                  {editingProduct ? 'Atualize as informações do produto' : 'Preencha os dados do novo produto'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome do Produto</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Nome do produto"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                    placeholder="SKU do produto"
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
                </div>

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
                <TableHead>Preço de Venda</TableHead>
                <TableHead>Estoque Atual</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-gray-500">Nenhum produto cadastrado</p>
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.nome}</TableCell>
                    <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                    <TableCell>R$ {product.precoVenda.toFixed(2)}</TableCell>
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
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
