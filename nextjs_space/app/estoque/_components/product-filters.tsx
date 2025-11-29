import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { Category } from "@/hooks/use-products";

interface ProductFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  categoryFilter: string;
  setCategoryFilter: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  ordenacao: string;
  setOrdenacao: (value: string) => void;
  categories: Category[];
}

export function ProductFilters({
  searchTerm,
  setSearchTerm,
  categoryFilter,
  setCategoryFilter,
  statusFilter,
  setStatusFilter,
  ordenacao,
  setOrdenacao,
  categories,
}: ProductFiltersProps) {
  return (
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
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
  );
}
