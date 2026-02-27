import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
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
import { Edit, Trash2, Package, Layers } from "lucide-react";
import { Product } from "@/hooks/use-products";
import { Card, CardContent } from "@/components/ui/card";

interface ProductTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onManageLots: (product: Product) => void;
}

// Componente de Card para Mobile
function ProductCard({
  product,
  onEdit,
  onDelete,
  onManageLots,
}: {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onManageLots: (product: Product) => void;
}) {
  return (
    <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {product.nome}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {product.sku}
            </p>
          </div>
          {product.estoqueAtual <= product.estoqueMinimo ? (
            <Badge variant="destructive" className="text-xs ml-2 flex-shrink-0">
              Estoque Baixo
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-xs ml-2 flex-shrink-0"
            >
              Normal
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Categoria
            </p>
            <p className="text-sm text-gray-900 dark:text-gray-100">
              {product.category?.nome || "-"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Estoque</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {product.estoqueAtual} un
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Preço Venda
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              R$ {product.precoVenda.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Preço Custo
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              R$ {product.precoCompra.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Margem</p>
            <p
              className={`text-sm font-semibold ${
                product.precoVenda - product.precoCompra > 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              R$ {(product.precoVenda - product.precoCompra).toFixed(2)}
              <span className="text-xs font-normal ml-1">
                (
                {product.precoVenda > 0
                  ? (
                      ((product.precoVenda - product.precoCompra) /
                        product.precoVenda) *
                      100
                    ).toFixed(0)
                  : 0}
                %)
              </span>
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <InteractiveHoverButton
            className="flex-1 h-9 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-200 dark:border-blue-800"
            onClick={() => onManageLots(product)}
          >
            <span className="flex items-center justify-center gap-2">
              <Layers className="h-4 w-4" />
              Lotes
            </span>
          </InteractiveHoverButton>
          <InteractiveHoverButton
            className="h-9 w-9 min-w-9 px-0 border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800"
            onClick={() => onEdit(product)}
          >
            <Edit className="h-4 w-4" />
          </InteractiveHoverButton>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <InteractiveHoverButton className="h-9 w-9 min-w-9 px-0 border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                <Trash2 className="h-4 w-4" />
              </InteractiveHoverButton>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 mx-4">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-gray-900 dark:text-gray-100">
                  Excluir Produto
                </AlertDialogTitle>
                <AlertDialogDescription className="text-gray-500 dark:text-gray-400">
                  Tem certeza que deseja excluir &quot;{product.nome}&quot;?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-700">
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(product.id)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProductTable({
  products,
  onEdit,
  onDelete,
  onManageLots,
}: ProductTableProps) {
  if (products.length === 0) {
    return (
      <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
        <CardContent className="py-12">
          <div className="text-center">
            <Package className="h-12 w-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-500 dark:text-gray-400">
              Nenhum produto encontrado
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Mobile: Card Layout */}
      <div className="md:hidden space-y-3">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onEdit={onEdit}
            onDelete={onDelete}
            onManageLots={onManageLots}
          />
        ))}
      </div>

      {/* Desktop: Table Layout */}
      <Card className="hidden md:block bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
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
                <TableHead className="text-center text-gray-700 dark:text-gray-300">
                  Lotes
                </TableHead>
                <TableHead className="text-right text-gray-700 dark:text-gray-300">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
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
                      <span
                        className={`text-xs font-semibold ${
                          product.precoVenda - product.precoCompra > 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        Margem: R${" "}
                        {(product.precoVenda - product.precoCompra).toFixed(2)}{" "}
                        (
                        {product.precoVenda > 0
                          ? (
                              ((product.precoVenda - product.precoCompra) /
                                product.precoVenda) *
                              100
                            ).toFixed(0)
                          : 0}
                        %)
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
                    <div className="flex justify-center">
                      <InteractiveHoverButton
                        className="flex items-center justify-center h-8 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-200 dark:border-blue-800 min-w-[120px]"
                        onClick={() => onManageLots(product)}
                      >
                        <span className="flex items-center justify-center gap-2">
                          <Layers className="h-4 w-4" />
                          Ver Lotes
                        </span>
                      </InteractiveHoverButton>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-1">
                      <InteractiveHoverButton
                        className="w-10 min-w-10 px-0 border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800"
                        onClick={() => onEdit(product)}
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
                              Tem certeza que deseja excluir &quot;
                              {product.nome}&quot;?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-700">
                              Cancelar
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDelete(product.id)}
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
