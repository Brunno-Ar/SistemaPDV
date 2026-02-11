import { Input } from "@/components/ui/input";
import { Search, Package } from "lucide-react";
import { Product } from "@/hooks/use-pos";
import { useState, useCallback } from "react";
import { ProductCard } from "./ProductCard";

interface ProductGridProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
  sortOption?: string;
  onSortChange?: (value: string) => void;
}

export function ProductGrid({
  products,
  onAddToCart,
  searchTerm,
  onSearchChange,
  searchInputRef,
  sortOption: _sortOption,
  onSortChange: _onSortChange,
}: ProductGridProps) {
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  const handleProductClick = useCallback(
    (product: Product) => {
      onAddToCart(product);
      setLastAddedId(product.id);

      // Clear visual feedback after animation
      const timer = setTimeout(() => setLastAddedId(null), 300);
      return () => clearTimeout(timer);
    },
    [onAddToCart],
  );

  const renderEmptyState = () => (
    <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 animate-in fade-in duration-500">
      <div className="bg-white dark:bg-[#182635] p-6 rounded-full shadow-sm mb-4">
        <Package className="h-10 w-10 text-gray-300 dark:text-gray-600" />
      </div>
      <p className="text-lg font-medium">Nenhum produto encontrado</p>
      <p className="text-sm mt-1 opacity-70">
        {searchTerm
          ? "Tente buscar com outros termos"
          : "Cadastre produtos no estoque para começar"}
      </p>
    </div>
  );

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Search Header */}
      <div className="relative flex-none">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 z-10 pointer-events-none" />
        <Input
          ref={searchInputRef}
          placeholder="Buscar produtos... (F2)"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-14 pl-12 rounded-xl shadow-sm bg-white dark:bg-[#182635] border-2 border-gray-200 dark:border-gray-700 text-base focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-transparent transition-all"
        />
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide">
        {products.length === 0 ? (
          renderEmptyState()
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={handleProductClick}
                isLastAdded={lastAddedId === product.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
