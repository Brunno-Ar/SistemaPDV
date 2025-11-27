"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Edit,
  Trash2,
  Package,
  Search,
  Filter,
  Layers,
  AlertTriangle,
  CheckCircle,
  Calendar,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Product {
  id: string;
  nome: string;
  sku: string;
  precoVenda: number;
  precoCompra: number;
  estoqueAtual: number;
  estoqueMinimo: number;
  imagemUrl?: string | null;
  categoryId?: string | null;
  category?: {
    nome: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface Category {
  id: string;
  nome: string;
}

interface Lote {
  id: string;
  numeroLote: string;
  dataValidade: string | null;
  quantidade: number;
  status?: string;
}

interface EstoqueClientProps {
  companyId?: string;
}

export default function EstoqueClient({ companyId }: EstoqueClientProps = {}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // New Category Dialog State
  const [newCategoryDialogOpen, setNewCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "todos" | "baixo" | "normal"
  >("todos");
  const [categoryFilter, setCategoryFilter] = useState("todos");
  const [ordenacao, setOrdenacao] = useState("nome-asc");

  // Lotes
  const [lotsDialogOpen, setLotsDialogOpen] = useState(false);
  const [selectedProductForLots, setSelectedProductForLots] =
    useState<Product | null>(null);
  const [productLots, setProductLots] = useState<Lote[]>([]);
  const [loadingLots, setLoadingLots] = useState(false);

  // New Lot State
  const [newLoteData, setNewLoteData] = useState({
    numeroLote: "",
    dataValidade: "",
    quantidade: "",
    precoCompra: "",
  });
  const [creatingLote, setCreatingLote] = useState(false);
  const [showNewLoteForm, setShowNewLoteForm] = useState(false);

  const handleCreateLote = async () => {
    if (!selectedProductForLots || !newLoteData.quantidade) return;

    setCreatingLote(true);
    try {
      const response = await fetch("/api/admin/lotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produtoId: selectedProductForLots.id,
          numeroLote: newLoteData.numeroLote,
          dataValidade: newLoteData.dataValidade || null,
          quantidade: parseInt(newLoteData.quantidade),
          precoCompra: newLoteData.precoCompra
            ? parseFloat(newLoteData.precoCompra)
            : 0,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar lote");
      }

      toast({
        title: "Sucesso",
        description: "Lote criado com sucesso!",
      });

      fetchProductLots(selectedProductForLots.id);
      fetchProducts(); // Atualizar estoque total
      setNewLoteData({
        numeroLote: "",
        dataValidade: "",
        quantidade: "",
        precoCompra: "",
      });
      setShowNewLoteForm(false);
    } catch (error) {
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Erro ao criar lote",
        variant: "destructive",
      });
    } finally {
      setCreatingLote(false);
    }
  };

  // Form state
  const [formData, setFormData] = useState({
    nome: "",
    sku: "",
    precoVenda: "",
    precoCompra: "",
    estoqueAtual: "",
    estoqueMinimo: "",
    imagemUrl: "",
    loteInicial: "",
    validadeInicial: "",
    categoryId: "",
  });
  const [semValidadeInicial, setSemValidadeInicial] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>("");

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/admin/categories");
      const data = await response.json();
      if (response.ok) {
        setCategories(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const url = companyId
        ? `/api/admin/products?companyId=${companyId}`
        : "/api/admin/products";

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok)
        throw new Error(data.error || "Erro ao carregar produtos");

      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      setProducts([]);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os produtos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProductLots = async (productId: string) => {
    setLoadingLots(true);
    setProductLots([]);
    try {
      const response = await fetch(`/api/admin/lotes?produtoId=${productId}`);
      const data = await response.json();
      if (response.ok) {
        // Ordenar: vencimento mais próximo primeiro (nulls por último)
        const sortedLots = Array.isArray(data)
          ? data.sort((a: any, b: any) => {
              if (!a.dataValidade) return 1;
              if (!b.dataValidade) return -1;
              return (
                new Date(a.dataValidade).getTime() -
                new Date(b.dataValidade).getTime()
              );
            })
          : [];
        setProductLots(sortedLots);
      } else {
        toast({
          title: "Erro",
          description: "Erro ao buscar lotes.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao buscar lotes:", error);
    } finally {
      setLoadingLots(false);
    }
  };

  const handleOpenLotsDialog = (product: Product) => {
    setSelectedProductForLots(product);
    setLotsDialogOpen(true);
    fetchProductLots(product.id);
  };

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        nome: product.nome,
        sku: product.sku,
        precoVenda: product.precoVenda.toString(),
        precoCompra: product.precoCompra.toString(),
        estoqueAtual: product.estoqueAtual.toString(),
        estoqueMinimo: product.estoqueMinimo.toString(),
        imagemUrl: product.imagemUrl || "",
        loteInicial: "",
        validadeInicial: "",
        categoryId: product.categoryId || "",
      });
      setImagePreview("");
      setSelectedFile(null);
      setSemValidadeInicial(false);
    } else {
      setEditingProduct(null);
      setFormData({
        nome: "",
        sku: "",
        precoVenda: "",
        precoCompra: "",
        estoqueAtual: "0",
        estoqueMinimo: "5",
        imagemUrl: "",
        loteInicial: "0",
        validadeInicial: "",
        categoryId: "",
      });
      setImagePreview("");
      setSelectedFile(null);
      setSemValidadeInicial(false);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingProduct(null);
    setFormData({
      nome: "",
      sku: "",
      precoVenda: "",
      precoCompra: "",
      estoqueAtual: "",
      estoqueMinimo: "",
      imagemUrl: "",
      loteInicial: "",
      validadeInicial: "",
      categoryId: "",
    });
    setSelectedFile(null);
    setImagePreview("");
    setSemValidadeInicial(false);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;

    setCreatingCategory(true);
    try {
      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: newCategoryName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar categoria");
      }

      toast({
        title: "Sucesso",
        description: "Categoria criada com sucesso!",
      });

      // Atualizar lista e selecionar a nova categoria
      setCategories((prev) =>
        [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome))
      );
      setFormData((prev) => ({ ...prev, categoryId: data.id }));
      setNewCategoryName("");
      setNewCategoryDialogOpen(false);
    } catch (error) {
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Erro ao criar categoria",
        variant: "destructive",
      });
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!selectedFile) return null;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      return data.cloud_storage_path;
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao fazer upload da imagem",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.precoVenda || !formData.precoCompra) {
      toast({
        title: "Erro",
        description: "Preencha os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    const precoVenda = parseFloat(formData.precoVenda);
    const precoCompra = parseFloat(formData.precoCompra);
    const estoqueAtual = formData.estoqueAtual
      ? parseInt(formData.estoqueAtual)
      : 0;
    const estoqueMinimo = parseInt(formData.estoqueMinimo) || 5;

    if (precoVenda <= 0 || precoCompra < 0) {
      toast({
        title: "Erro",
        description: "Preços inválidos",
        variant: "destructive",
      });
      return;
    }

    try {
      let imagemUrl = formData.imagemUrl;
      if (selectedFile) {
        const uploadedUrl = await uploadImage();
        if (uploadedUrl) imagemUrl = uploadedUrl;
      }

      let url = editingProduct
        ? `/api/admin/products/${editingProduct.id}`
        : "/api/admin/products";
      if (companyId) url += `?companyId=${companyId}`;

      const method = editingProduct ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: formData.nome,
          sku: formData.sku,
          precoVenda,
          precoCompra,
          estoqueAtual,
          estoqueMinimo,
          imagemUrl: imagemUrl || null,
          loteInicial: formData.loteInicial
            ? parseInt(formData.loteInicial)
            : undefined,
          validadeInicial: semValidadeInicial
            ? null
            : formData.validadeInicial || undefined,
          categoryId: formData.categoryId || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao salvar produto");

      toast({
        title: "Sucesso",
        description: editingProduct ? "Produto atualizado" : "Produto criado",
      });
      handleCloseDialog();
      fetchProducts();
    } catch (error) {
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (productId: string) => {
    try {
      let url = `/api/admin/products/${productId}`;
      if (companyId) url += `?companyId=${companyId}`;
      const response = await fetch(url, { method: "DELETE" });
      if (!response.ok) throw new Error("Erro ao excluir");
      toast({ title: "Sucesso", description: "Produto excluído" });
      fetchProducts();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir produto",
        variant: "destructive",
      });
    }
  };

  // Lógica de Filtragem e Ordenação
  const filteredAndSortedProducts = products
    .filter((product) => {
      const matchesSearch =
        product.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesStatus = true;
      if (statusFilter === "baixo") {
        matchesStatus = product.estoqueAtual <= product.estoqueMinimo;
      } else if (statusFilter === "normal") {
        matchesStatus = product.estoqueAtual > product.estoqueMinimo;
      }

      let matchesCategory = true;
      if (categoryFilter !== "todos") {
        if (categoryFilter === "sem_categoria") {
          matchesCategory = !product.categoryId;
        } else {
          matchesCategory = product.categoryId === categoryFilter;
        }
      }

      return matchesSearch && matchesStatus && matchesCategory;
    })
    .sort((a, b) => {
      // ... (sorting logic)
      switch (ordenacao) {
        case "nome-asc":
          return a.nome.localeCompare(b.nome);
        case "nome-desc":
          return b.nome.localeCompare(a.nome);
        case "preco-asc":
          return a.precoVenda - b.precoVenda;
        case "preco-desc":
          return b.precoVenda - a.precoVenda;
        case "estoque-asc":
          return a.estoqueAtual - b.estoqueAtual;
        case "estoque-desc":
          return b.estoqueAtual - a.estoqueAtual;
        default:
          return 0;
      }
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        Carregando estoque...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header e Filtros */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle>Gestão de Estoque</CardTitle>
              <p className="text-sm text-gray-600">
                {products.length} produtos cadastrados
              </p>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Produto
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <Label htmlFor="search">Buscar Produto</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Nome ou SKU..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="w-full md:w-[200px]">
              <Label>Categoria</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="sem_categoria">Sem Categoria</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-[200px]">
              <Label>Status do Estoque</Label>
              <Select
                value={statusFilter}
                onValueChange={(value: any) => setStatusFilter(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="baixo">⚠️ Estoque Baixo</SelectItem>
                  <SelectItem value="normal">✅ Estoque Normal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-[200px]">
              <Label>Ordenar por</Label>
              <Select value={ordenacao} onValueChange={setOrdenacao}>
                <SelectTrigger>
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nome-asc">Nome (A-Z)</SelectItem>
                  <SelectItem value="nome-desc">Nome (Z-A)</SelectItem>
                  <SelectItem value="preco-asc">
                    Preço (Menor &gt; Maior)
                  </SelectItem>
                  <SelectItem value="preco-desc">
                    Preço (Maior &gt; Menor)
                  </SelectItem>
                  <SelectItem value="estoque-asc">
                    Estoque (Menor &gt; Maior)
                  </SelectItem>
                  <SelectItem value="estoque-desc">
                    Estoque (Maior &gt; Menor)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Produtos */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Preços</TableHead>
                <TableHead>Estoque Total</TableHead>
                <TableHead>Lotes</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-gray-500">Nenhum produto encontrado</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{product.nome}</span>
                        <span className="text-xs text-gray-500 font-mono">
                          {product.sku}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.category ? (
                        <Badge variant="secondary" className="font-normal">
                          {product.category.nome}
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span>
                          Venda:{" "}
                          <strong>R$ {product.precoVenda.toFixed(2)}</strong>
                        </span>
                        <span className="text-gray-500 text-xs">
                          Custo: R$ {product.precoCompra.toFixed(2)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {product.estoqueAtual} un
                        </span>
                        {product.estoqueAtual <= product.estoqueMinimo ? (
                          <Badge
                            variant="destructive"
                            className="text-xs px-1.5 py-0 h-5"
                          >
                            Baixo
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-green-600 border-green-200 bg-green-50 text-xs px-1.5 py-0 h-5"
                          >
                            Normal
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => handleOpenLotsDialog(product)}
                      >
                        <Layers className="h-4 w-4 mr-1" />
                        Ver Lotes
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenDialog(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Excluir Produto
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir "{product.nome}"?
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

      {/* Dialog de Edição/Criação */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => !open && handleCloseDialog()}
      >
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
            <DialogDescription>
              {editingProduct
                ? "Atualize os dados do produto."
                : "Preencha as informações do novo produto."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData({ ...formData, nome: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) =>
                    setFormData({ ...formData, sku: e.target.value })
                  }
                  placeholder="Gerado automaticamente se vazio"
                />
              </div>
            </div>

            {/* Categoria */}
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, categoryId: value })
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sem_categoria">Sem Categoria</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setNewCategoryDialogOpen(true)}
                  title="Nova Categoria"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="precoCompra">Custo (R$)</Label>
                <Input
                  id="precoCompra"
                  type="number"
                  step="0.01"
                  value={formData.precoCompra}
                  onChange={(e) =>
                    setFormData({ ...formData, precoCompra: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="precoVenda">Venda (R$)</Label>
                <Input
                  id="precoVenda"
                  type="number"
                  step="0.01"
                  value={formData.precoVenda}
                  onChange={(e) =>
                    setFormData({ ...formData, precoVenda: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            {editingProduct ? (
              <div className="space-y-2">
                <Label htmlFor="estoqueAtual">Estoque Atual</Label>
                <Input
                  id="estoqueAtual"
                  type="number"
                  value={formData.estoqueAtual}
                  onChange={(e) =>
                    setFormData({ ...formData, estoqueAtual: e.target.value })
                  }
                  required
                />
              </div>
            ) : (
              /* 🆕 SEÇÃO: ESTOQUE INICIAL (PRIMEIRO LOTE) */
              <div className="space-y-4 p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                <div className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-900">
                    Estoque Inicial (Primeiro Lote)
                  </h3>
                </div>
                <p className="text-sm text-gray-700">
                  📦 <strong>Cadastro Unificado:</strong> Crie o produto e seu
                  primeiro lote em uma única etapa!
                </p>

                <div className="space-y-2">
                  <Label htmlFor="loteInicial">Quantidade do Lote</Label>
                  <Input
                    id="loteInicial"
                    type="number"
                    min="0"
                    value={formData.loteInicial}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        loteInicial: e.target.value,
                      })
                    }
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500">
                    💡 Se informar quantidade &gt; 0, o estoque inicial será
                    definido automaticamente
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="validadeInicial">Data de Validade</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="semValidadeInicial"
                        checked={semValidadeInicial}
                        onCheckedChange={(checked) => {
                          setSemValidadeInicial(checked as boolean);
                          if (checked) {
                            setFormData({ ...formData, validadeInicial: "" });
                          }
                        }}
                      />
                      <Label
                        htmlFor="semValidadeInicial"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Produto sem validade
                      </Label>
                    </div>
                  </div>
                  <Input
                    id="validadeInicial"
                    type="date"
                    value={formData.validadeInicial}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        validadeInicial: e.target.value,
                      })
                    }
                    min={new Date().toISOString().split("T")[0]}
                    disabled={semValidadeInicial}
                    required={!semValidadeInicial && !!formData.loteInicial}
                  />
                  <p className="text-xs text-gray-500">
                    📅 Obrigatória se houver quantidade no lote (exceto se "Sem
                    validade")
                  </p>
                </div>

                <div className="bg-white p-3 rounded border border-blue-300">
                  <p className="text-sm text-gray-700">
                    <strong>Como funciona:</strong> Ao criar o produto com lote
                    inicial, você economiza tempo ao não precisar cadastrar o
                    lote em outra tela. O número do lote será gerado
                    automaticamente.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="estoqueMinimo">Estoque Mínimo (Alerta)</Label>
              <Input
                id="estoqueMinimo"
                type="number"
                value={formData.estoqueMinimo}
                onChange={(e) =>
                  setFormData({ ...formData, estoqueMinimo: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Imagem (Opcional)</Label>
              <Input type="file" accept="image/*" onChange={handleFileChange} />
              {(imagePreview ||
                (editingProduct?.imagemUrl && !selectedFile)) && (
                <img
                  src={imagePreview || editingProduct?.imagemUrl || ""}
                  alt="Preview"
                  className="w-20 h-20 object-cover rounded border mt-2"
                />
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={uploadingImage}>
                {uploadingImage ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Nova Categoria */}
      <Dialog
        open={newCategoryDialogOpen}
        onOpenChange={setNewCategoryDialogOpen}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
            <DialogDescription>
              Crie uma nova categoria para organizar seus produtos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="categoryName">Nome da Categoria</Label>
              <Input
                id="categoryName"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Ex: Bebidas, Limpeza..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setNewCategoryDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateCategory}
                disabled={creatingCategory}
              >
                {creatingCategory ? "Criando..." : "Criar Categoria"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Visualização de Lotes */}
      <Dialog open={lotsDialogOpen} onOpenChange={setLotsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Lotes: {selectedProductForLots?.nome}</DialogTitle>
            <DialogDescription>
              Gerenciamento de validade e lotes ativos.
            </DialogDescription>
          </DialogHeader>

          {showNewLoteForm ? (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numeroLote">Número do Lote (Opcional)</Label>
                  <Input
                    id="numeroLote"
                    value={newLoteData.numeroLote}
                    onChange={(e) =>
                      setNewLoteData({
                        ...newLoteData,
                        numeroLote: e.target.value,
                      })
                    }
                    placeholder="Gerado automaticamente"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantidadeLote">Quantidade</Label>
                  <Input
                    id="quantidadeLote"
                    type="number"
                    value={newLoteData.quantidade}
                    onChange={(e) =>
                      setNewLoteData({
                        ...newLoteData,
                        quantidade: e.target.value,
                      })
                    }
                    placeholder="Qtd"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="validadeLote">Validade</Label>
                  <Input
                    id="validadeLote"
                    type="date"
                    value={newLoteData.dataValidade}
                    onChange={(e) =>
                      setNewLoteData({
                        ...newLoteData,
                        dataValidade: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custoLote">Custo Unit. (R$)</Label>
                  <Input
                    id="custoLote"
                    type="number"
                    step="0.01"
                    value={newLoteData.precoCompra}
                    onChange={(e) =>
                      setNewLoteData({
                        ...newLoteData,
                        precoCompra: e.target.value,
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowNewLoteForm(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleCreateLote} disabled={creatingLote}>
                  {creatingLote ? "Salvando..." : "Salvar Lote"}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {loadingLots ? (
                <div className="py-8 text-center text-gray-500">
                  Carregando lotes...
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => setShowNewLoteForm(true)}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Novo Lote
                    </Button>
                  </div>
                  <div className="border rounded-md overflow-hidden max-h-[300px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead>Lote</TableHead>
                          <TableHead>Validade</TableHead>
                          <TableHead>Qtd.</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productLots.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className="text-center py-4 text-gray-500"
                            >
                              Nenhum lote encontrado.
                            </TableCell>
                          </TableRow>
                        ) : (
                          productLots.map((lote) => (
                            <TableRow key={lote.id}>
                              <TableCell className="font-mono text-xs">
                                {lote.numeroLote}
                              </TableCell>
                              <TableCell>
                                {lote.dataValidade ? (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3 text-gray-400" />
                                    {new Date(
                                      lote.dataValidade
                                    ).toLocaleDateString("pt-BR")}
                                  </div>
                                ) : (
                                  <span className="text-gray-500 italic">
                                    Indeterminado
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="font-medium">
                                {lote.quantidade}
                              </TableCell>
                              <TableCell>
                                {lote.status === "vencido" ? (
                                  <Badge
                                    variant="destructive"
                                    className="text-[10px] h-5"
                                  >
                                    Vencido
                                  </Badge>
                                ) : lote.status === "proximo_vencimento" ? (
                                  <Badge className="bg-yellow-500 text-[10px] h-5">
                                    Vence Logo
                                  </Badge>
                                ) : !lote.dataValidade ? (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] h-5"
                                  >
                                    S/ Validade
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="text-green-600 border-green-200 text-[10px] h-5"
                                  >
                                    Normal
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setLotsDialogOpen(false)}
                    >
                      Fechar
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
