import { useState, useEffect, useCallback } from "react";
import { toast } from "@/hooks/use-toast";

export interface Product {
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

export interface Category {
  id: string;
  nome: string;
}

interface UseProductsProps {
  companyId?: string;
}

export function useProducts({ companyId }: UseProductsProps = {}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/categories");
      const data = await response.json();
      if (response.ok) {
        setCategories(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
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
  }, [companyId]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  const deleteProduct = async (productId: string) => {
    try {
      let url = `/api/admin/products/${productId}`;
      if (companyId) url += `?companyId=${companyId}`;
      const response = await fetch(url, { method: "DELETE" });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao excluir");
      }

      // Optimistic update
      setProducts((prev) => prev.filter((p) => p.id !== productId));

      toast({ title: "Sucesso", description: "Produto excluído" });

      // Background re-fetch to ensure consistency
      fetchProducts();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir produto",
        variant: "destructive",
      });
    }
  };

  const createCategory = async (name: string) => {
    try {
      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: name }),
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
      return true;
    } catch (error) {
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Erro ao criar categoria",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    products,
    categories,
    loading,
    fetchProducts,
    deleteProduct,
    createCategory,
  };
}
