import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { ShoppingCart, Trash2, Plus, Minus, DollarSign } from "lucide-react";
import { CartItem } from "@/hooks/use-pos";

interface CartSummaryProps {
  cart: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onUpdateDiscount: (productId: string, discount: number) => void;
  paymentMethod: string;
  onPaymentMethodChange: (method: string) => void;
  onFinalize: () => void;
  onClear: () => void;
  isOffline: boolean;
  finalizing: boolean;
  paymentError: boolean;
  setPaymentError: (error: boolean) => void;
  total: number;
}

export function CartSummary({
  cart,
  onUpdateQuantity,
  onRemove,
  onUpdateDiscount,
  paymentMethod,
  onPaymentMethodChange,
  onFinalize,
  onClear,
  isOffline,
  finalizing,
  paymentError,
  setPaymentError,
  total,
}: CartSummaryProps) {
  return (
    <Card className="lg:sticky lg:top-20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <ShoppingCart className="h-5 w-5" />
          Carrinho de Vendas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {cart.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <ShoppingCart className="h-12 w-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p>Carrinho vazio</p>
            <p className="text-sm">Clique nos produtos para adicionar</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 max-h-60 lg:max-h-80 overflow-y-auto">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs sm:text-sm truncate">
                        {item.product.nome}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        R$ {item.product.precoVenda.toFixed(2)} / un.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onRemove(item.product.id)}
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs text-gray-600 dark:text-gray-400">
                        Quantidade
                      </label>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            onUpdateQuantity(
                              item.product.id,
                              item.quantidade - 1
                            )
                          }
                          className="h-7 w-7 p-0"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="min-w-[2rem] text-center text-xs sm:text-sm font-medium">
                          {item.quantidade}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            onUpdateQuantity(
                              item.product.id,
                              item.quantidade + 1
                            )
                          }
                          className="h-7 w-7 p-0"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-gray-600 dark:text-gray-400">
                        Desconto (R$)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max={item.quantidade * item.product.precoVenda}
                        step="0.01"
                        value={item.descontoAplicado}
                        onChange={(e) =>
                          onUpdateDiscount(
                            item.product.id,
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1 border-t border-gray-200 dark:border-zinc-700">
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      Subtotal:
                    </span>
                    <span className="font-semibold text-sm text-green-600 dark:text-green-400">
                      R$ {item.subtotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <label
                className={`text-xs sm:text-sm font-medium ${
                  paymentError ? "text-red-600" : ""
                }`}
              >
                Método de Pagamento{" "}
                {paymentError && <span className="text-red-600">*</span>}
              </label>
              <Select
                value={paymentMethod}
                onValueChange={(value) => {
                  onPaymentMethodChange(value);
                  setPaymentError(false);
                }}
              >
                <SelectTrigger
                  className={`text-sm ${
                    paymentError
                      ? "border-red-500 border-2 ring-2 ring-red-200 animate-shake"
                      : ""
                  }`}
                >
                  <SelectValue placeholder="Selecione o método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="debito">Cartão de Débito</SelectItem>
                  <SelectItem value="credito">Cartão de Crédito</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                </SelectContent>
              </Select>
              {paymentError && (
                <p className="text-xs text-red-600 font-medium">
                  ⚠️ Selecione uma forma de pagamento
                </p>
              )}
            </div>

            <div className="border-t pt-4 dark:border-zinc-800">
              <div className="flex justify-between items-center text-base sm:text-lg font-bold">
                <span>Total:</span>
                <span className="text-green-600 dark:text-green-400">
                  R$ {total.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <InteractiveHoverButton
                id="btn-finalizar-venda"
                onClick={onFinalize}
                className="w-full bg-green-600 hover:bg-green-700 text-white text-sm sm:text-base border-green-600"
                disabled={finalizing || isOffline}
              >
                <span className="flex items-center justify-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  {finalizing
                    ? "Finalizando..."
                    : isOffline
                    ? "Sem Conexão"
                    : "Finalizar Venda (F12)"}
                </span>
              </InteractiveHoverButton>
              <InteractiveHoverButton
                onClick={onClear}
                className="w-full text-sm sm:text-base border-gray-200 hover:bg-gray-100 text-gray-800 dark:border-zinc-700 dark:text-gray-200 dark:hover:bg-zinc-800"
                disabled={finalizing}
              >
                Limpar Carrinho
              </InteractiveHoverButton>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
