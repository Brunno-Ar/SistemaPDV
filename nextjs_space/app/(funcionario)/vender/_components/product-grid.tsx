import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Package } from "lucide-react";
import Image from "next/image";
import { Product } from "@/hooks/use-pos";

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
  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            ref={searchInputRef}
            placeholder="Buscar produtos... (F2)"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-12">
            <Package className="h-12 sm:h-16 w-12 sm:w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-base sm:text-lg font-medium">
              Nenhum produto encontrado
            </p>
            <p className="text-xs sm:text-sm mt-2">
              {searchTerm
                ? "Tente buscar com outros termos"
                : "Cadastre produtos no estoque para começar"}
            </p>
          </div>
        ) : (
          <div className="grid-responsive">
            {products.map((product) => (
              <Card
                key={product.id}
                className="cursor-pointer hover:shadow-md transition-shadow border border-gray-200 dark:border-zinc-800 hover:border-primary overflow-hidden"
                onClick={() => onAddToCart(product)}
              >
                <div className="relative w-full aspect-video bg-gray-100 dark:bg-zinc-800">
                  <ProductImage
                    imagemUrl={product.imagemUrl}
                    nome={product.nome}
                  />
                </div>
                <CardContent className="p-3 sm:p-4">
                  <div className="space-y-2">
                    <h3 className="font-medium text-xs sm:text-sm line-clamp-2">
                      {product.nome}
                    </h3>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-base sm:text-lg font-bold text-green-600 dark:text-green-400">
                        R$ {product.precoVenda.toFixed(2)}
                      </span>
                      <Badge
                        variant={
                          product.estoqueAtual > 0 ? "default" : "destructive"
                        }
                        className="text-xs"
                      >
                        {product.estoqueAtual > 0
                          ? `${product.estoqueAtual} un.`
                          : "Sem estoque"}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
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
  );
}
