"use client";

import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { PageHeader } from "@/components/ui/page-header";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { MessageLoading } from "@/components/ui/message-loading";
import { ProductFormDialog } from "./product-form-dialog";
import { LotManagerDialog } from "./lot-manager-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useProducts, Product } from "@/hooks/use-products";
import { ProductFilters } from "./product-filters";
import { ProductTable } from "./product-table";

interface EstoqueClientProps {
  companyId?: string;
}

export default function EstoqueClient({ companyId }: EstoqueClientProps = {}) {
  const searchParams = useSearchParams();
  const {
    products,
    categories,
    loading,
    fetchProducts,
    deleteProduct,
    createCategory,
  } = useProducts({ companyId });

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
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [categoryFilter, setCategoryFilter] = useState("todos");
  const [ordenacao, setOrdenacao] = useState("nome-asc");

  useEffect(() => {
    // Check for URL filters
    const filterParam = searchParams.get("filter");
    if (filterParam === "low_stock") {
      setStatusFilter("baixo");
    }
  }, [searchParams]);

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

  const handleCreateCategoryWrapper = async () => {
    if (!newCategoryName.trim()) return;
    setCreatingCategory(true);
    const success = await createCategory(newCategoryName);
    setCreatingCategory(false);
    if (success) {
      setNewCategoryName("");
      setNewCategoryDialogOpen(false);
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
      {/* Header */}
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
      <ProductFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        ordenacao={ordenacao}
        setOrdenacao={setOrdenacao}
        categories={categories}
      />

      {/* Tabela de Produtos */}
      <ProductTable
        products={filteredAndSortedProducts}
        onEdit={handleOpenDialog}
        onDelete={deleteProduct}
        onManageLots={handleOpenLotsDialog}
      />

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
                onClick={handleCreateCategoryWrapper}
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
