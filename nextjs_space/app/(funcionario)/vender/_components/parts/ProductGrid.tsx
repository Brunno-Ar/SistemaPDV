import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Package } from "lucide-react";
import Image from "next/image";
import { Product } from "@/hooks/use-pos";
import { useState } from "react";

interface ProductGridProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
}

function ProductImage({
  imagemUrl,
  nome,
}: {
  imagemUrl?: string | null;
  nome: string;
}) {
  if (!imagemUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-zinc-800">
        <Package className="h-12 w-12 text-gray-300 dark:text-zinc-600" />
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

export function ProductGrid({
  products,
  onAddToCart,
  searchTerm,
  onSearchChange,
  searchInputRef,
}: ProductGridProps) {
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  const handleProductClick = (product: Product) => {
    onAddToCart(product);
    setLastAddedId(product.id);
    setTimeout(() => setLastAddedId(null), 300);
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="relative flex-none">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 z-10" />
        <Input
          ref={searchInputRef}
          placeholder="Buscar produtos... (F2)"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-14 pl-12 rounded-xl shadow-sm bg-white dark:bg-[#182635] border-2 border-gray-200 dark:border-gray-700 text-base focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary transition-all"
        />
      </div>

      <div className="flex-1 overflow-y-auto pr-2">
        {products.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
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
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
            {products.map((product) => (
              <div
                key={product.id}
                className={`group relative bg-white dark:bg-[#182635] rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-md hover:border-primary/50 transition-all duration-200 cursor-pointer overflow-hidden hover:scale-[1.02] ${
                  lastAddedId === product.id
                    ? "ring-2 ring-green-500 scale-95 border-green-500"
                    : ""
                }`}
                onClick={() => handleProductClick(product)}
              >
                <div className="aspect-square relative bg-gray-50 dark:bg-zinc-800/50">
                  <ProductImage
                    imagemUrl={product.imagemUrl}
                    nome={product.nome}
                  />
                  <Badge
                    variant={
                      product.estoqueAtual > 0 ? "secondary" : "destructive"
                    }
                    className={`absolute top-2 right-2 text-[10px] h-5 px-1.5 backdrop-blur-sm ${
                      product.estoqueAtual > 0
                        ? "bg-white/90 text-gray-700 dark:bg-black/50 dark:text-gray-200"
                        : ""
                    }`}
                  >
                    {product.estoqueAtual > 0
                      ? `${product.estoqueAtual} un.`
                      : "Sem estoque"}
                  </Badge>
                </div>

                <div className="p-3 space-y-1">
                  <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200 line-clamp-2 leading-tight min-h-[2.5rem]">
                    {product.nome}
                  </h3>
                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      R$ {product.precoVenda.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">
                      {product.sku}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
