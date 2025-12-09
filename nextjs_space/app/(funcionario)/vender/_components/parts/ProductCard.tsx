import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import Image from "next/image";
import { Product } from "@/hooks/use-pos";

interface ProductCardProps {
  product: Product;
  onClick: (product: Product) => void;
  isLastAdded: boolean;
}

export function ProductCard({
  product,
  onClick,
  isLastAdded,
}: ProductCardProps) {
  const hasStock = product.estoqueAtual > 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(product)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClick(product);
        }
      }}
      className={`
        group relative flex flex-col
        bg-white dark:bg-[#182635]
        rounded-xl
        border-2 border-gray-200 dark:border-gray-700
        hover:shadow-xl hover:border-blue-500 dark:hover:border-blue-400
        transition-all duration-200
        cursor-pointer
        ${
          isLastAdded
            ? "ring-2 ring-green-500 border-green-500 scale-[0.98]"
            : ""
        }
      `}
    >
      {/* Image Container - Explicitly handling rounded corners here to fix visual defects */}
      <div className="relative aspect-square w-full rounded-t-xl overflow-hidden bg-gray-50 dark:bg-zinc-800/50 isolation-isolate">
        {product.imagemUrl ? (
          <Image
            src={product.imagemUrl}
            alt={product.nome}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-12 w-12 text-gray-300 dark:text-zinc-600" />
          </div>
        )}

        {/* Badge - Always on top */}
        <Badge
          variant={hasStock ? "secondary" : "destructive"}
          className={`
            absolute top-2 right-2 
            text-[10px] h-5 px-1.5 
            backdrop-blur-md shadow-sm z-10
            ${
              hasStock
                ? "bg-white/90 text-gray-700 dark:bg-black/60 dark:text-gray-200"
                : ""
            }
          `}
        >
          {hasStock ? `${product.estoqueAtual} un.` : "Sem estoque"}
        </Badge>
      </div>

      {/* Content Info */}
      <div className="p-3 flex flex-col flex-1 gap-2">
        <h3
          className="font-bold text-sm text-gray-800 dark:text-gray-200 line-clamp-2 leading-tight min-h-[2.5rem]"
          title={product.nome}
        >
          {product.nome}
        </h3>

        <div className="mt-auto flex items-center justify-between">
          <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(product.precoVenda)}
          </span>
          <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
            {product.sku}
          </span>
        </div>
      </div>
    </div>
  );
}
