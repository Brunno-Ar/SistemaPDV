"use client";

import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { PageHeader } from "@/components/ui/page-header";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, Edit, Trash2, Package, Search, Layers } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { MessageLoading } from "@/components/ui/message-loading";
import { ProductFormDialog } from "./product-form-dialog";
import { LotManagerDialog } from "./lot-manager-dialog";

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

interface EstoqueClientProps {
  companyId?: string;
}

export default function EstoqueClient({ companyId }: EstoqueClientProps = {}) {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog States
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [lotsDialogOpen, setLotsDialogOpen] = useState(false);
  const [selectedProductForLots, setSelectedProductForLots] =
    useState<Product | null>(null);

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

  useEffect(() => {
    fetchProducts();
    fetchCategories();

    // Check for URL filters
    const filterParam = searchParams.get("filter");
    if (filterParam === "low_stock") {
      setStatusFilter("baixo");
    }
  }, [searchParams]);

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

  const handleOpenLotsDialog = (product: Product) => {
    setSelectedProductForLots(product);
    setLotsDialogOpen(true);
  };

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
    } else {
      setEditingProduct(null);
    }
    setDialogOpen(true);
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

      // Atualizar lista
      setCategories((prev) =>
        [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome))
      );
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
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <MessageLoading />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header e Filtros */}
      <PageHeader
        title="Gestão de Estoque"
        description={`${products.length} produtos cadastrados`}
        actions={
          <InteractiveHoverButton
            onClick={() => handleOpenDialog()}
            className="bg-primary text-primary-foreground border-primary hover:bg-primary/90"
          >
            <span className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Novo Produto
            </span>
          </InteractiveHoverButton>
        }
      />

      {/* Filtros */}
      <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <Label
                htmlFor="search"
                className="text-gray-700 dark:text-gray-300"
              >
                Buscar Produto
              </Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Nome ou SKU..."
                  className="pl-8 bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="w-full md:w-[200px]">
              <Label className="text-gray-700 dark:text-gray-300">
                Categoria
              </Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100">
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
                  <SelectItem
                    value="todos"
                    className="text-gray-900 dark:text-gray-100 focus:bg-gray-100 dark:focus:bg-zinc-800"
                  >
                    Todas
                  </SelectItem>
                  <SelectItem
                    value="sem_categoria"
                    className="text-gray-900 dark:text-gray-100 focus:bg-gray-100 dark:focus:bg-zinc-800"
                  >
                    Sem Categoria
                  </SelectItem>
                  {categories.map((cat) => (
                    <SelectItem
                      key={cat.id}
                      value={cat.id}
                      className="text-gray-900 dark:text-gray-100 focus:bg-gray-100 dark:focus:bg-zinc-800"
                    >
                      {cat.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-[200px]">
              <Label className="text-gray-700 dark:text-gray-300">
                Status do Estoque
              </Label>
              <Select
                value={statusFilter}
                onValueChange={(value: any) => setStatusFilter(value)}
              >
                <SelectTrigger className="bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
                  <SelectItem
                    value="todos"
                    className="text-gray-900 dark:text-gray-100 focus:bg-gray-100 dark:focus:bg-zinc-800"
                  >
                    Todos
                  </SelectItem>
                  <SelectItem
                    value="baixo"
                    className="text-gray-900 dark:text-gray-100 focus:bg-gray-100 dark:focus:bg-zinc-800"
                  >
                    ⚠️ Estoque Baixo
                  </SelectItem>
                  <SelectItem
                    value="normal"
                    className="text-gray-900 dark:text-gray-100 focus:bg-gray-100 dark:focus:bg-zinc-800"
                  >
                    ✅ Estoque Normal
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-[200px]">
              <Label className="text-gray-700 dark:text-gray-300">
                Ordenar por
              </Label>
              <Select value={ordenacao} onValueChange={setOrdenacao}>
                <SelectTrigger className="bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
                  <SelectItem
                    value="nome-asc"
                    className="text-gray-900 dark:text-gray-100 focus:bg-gray-100 dark:focus:bg-zinc-800"
                  >
                    Nome (A-Z)
                  </SelectItem>
                  <SelectItem
                    value="nome-desc"
                    className="text-gray-900 dark:text-gray-100 focus:bg-gray-100 dark:focus:bg-zinc-800"
                  >
                    Nome (Z-A)
                  </SelectItem>
                  <SelectItem
                    value="preco-asc"
                    className="text-gray-900 dark:text-gray-100 focus:bg-gray-100 dark:focus:bg-zinc-800"
                  >
                    Preço (Menor &gt; Maior)
                  </SelectItem>
                  <SelectItem
                    value="preco-desc"
                    className="text-gray-900 dark:text-gray-100 focus:bg-gray-100 dark:focus:bg-zinc-800"
                  >
                    Preço (Maior &gt; Menor)
                  </SelectItem>
                  <SelectItem
                    value="estoque-asc"
                    className="text-gray-900 dark:text-gray-100 focus:bg-gray-100 dark:focus:bg-zinc-800"
                  >
                    Estoque (Menor &gt; Maior)
                  </SelectItem>
                  <SelectItem
                    value="estoque-desc"
                    className="text-gray-900 dark:text-gray-100 focus:bg-gray-100 dark:focus:bg-zinc-800"
                  >
                    Estoque (Maior &gt; Menor)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Produtos */}
      <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 border-gray-200 dark:border-zinc-700">
                <TableHead className="text-gray-700 dark:text-gray-300">
                  Produto
                </TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">
                  Categoria
                </TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">
                  Preços
                </TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">
                  Estoque Total
                </TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">
                  Lotes
                </TableHead>
                <TableHead className="text-right text-gray-700 dark:text-gray-300">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Package className="h-12 w-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Nenhum produto encontrado
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedProducts.map((product) => (
                  <TableRow
                    key={product.id}
                    className="border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/50"
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {product.nome}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                          {product.sku}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.category ? (
                        <Badge
                          variant="secondary"
                          className="font-normal bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300"
                        >
                          {product.category.nome}
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span className="text-gray-900 dark:text-gray-100">
                          Venda:{" "}
                          <strong>R$ {product.precoVenda.toFixed(2)}</strong>
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 text-xs">
                          Custo: R$ {product.precoCompra.toFixed(2)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
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
                            className="text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-xs px-1.5 py-0 h-5"
                          >
                            Normal
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <InteractiveHoverButton
                        className="h-8 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-200 dark:border-blue-800 min-w-[120px]"
                        onClick={() => handleOpenLotsDialog(product)}
                      >
                        <span className="flex items-center gap-2">
                          <Layers className="h-4 w-4" />
                          Ver Lotes
                        </span>
                      </InteractiveHoverButton>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1">
                        <InteractiveHoverButton
                          className="w-10 min-w-10 px-0 border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800"
                          onClick={() => handleOpenDialog(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </InteractiveHoverButton>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <InteractiveHoverButton className="w-10 min-w-10 px-0 border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300">
                              <Trash2 className="h-4 w-4" />
                            </InteractiveHoverButton>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-gray-900 dark:text-gray-100">
                                Excluir Produto
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-gray-500 dark:text-gray-400">
                                Tem certeza que deseja excluir "{product.nome}"?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-700">
                                Cancelar
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(product.id)}
                                className="bg-red-600 hover:bg-red-700 text-white"
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

      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        productToEdit={editingProduct}
        onSuccess={fetchProducts}
        categories={categories}
        companyId={companyId}
        onOpenCategoryDialog={() => setNewCategoryDialogOpen(true)}
      />

      <LotManagerDialog
        open={lotsDialogOpen}
        onOpenChange={setLotsDialogOpen}
        product={selectedProductForLots}
      />

      {/* Dialog de Nova Categoria */}
      <Dialog
        open={newCategoryDialogOpen}
        onOpenChange={setNewCategoryDialogOpen}
      >
        <DialogContent className="sm:max-w-[400px] bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">
              Nova Categoria
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              Crie uma nova categoria para organizar seus produtos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label
                htmlFor="categoryName"
                className="text-gray-700 dark:text-gray-300"
              >
                Nome da Categoria
              </Label>
              <Input
                id="categoryName"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Ex: Bebidas, Limpeza..."
                className="bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="flex justify-end gap-2">
              <InteractiveHoverButton
                className="bg-white hover:bg-gray-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-zinc-700"
                onClick={() => setNewCategoryDialogOpen(false)}
              >
                Cancelar
              </InteractiveHoverButton>
              <InteractiveHoverButton
                onClick={handleCreateCategory}
                disabled={creatingCategory}
                className="bg-primary text-primary-foreground border-primary hover:bg-primary/90"
              >
                {creatingCategory ? "Criando..." : "Criar Categoria"}
              </InteractiveHoverButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
