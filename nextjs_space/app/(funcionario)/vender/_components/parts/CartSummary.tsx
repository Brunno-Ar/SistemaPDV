import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { parseCurrency } from "@/lib/utils";

interface CartSummaryProps {
  cart: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onUpdateDiscount: (productId: string, discount: number) => void;
  paymentMethod: string;
  onPaymentMethodChange: (method: string) => void;
  valorRecebido?: string;
  setValorRecebido?: (value: string) => void;
  troco?: number | null;
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
  valorRecebido,
  setValorRecebido,
  troco,
  onFinalize,
  onClear,
  isOffline,
  finalizing,
  paymentError,
  setPaymentError,
  total,
}: CartSummaryProps) {
  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#182635] rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex-none p-4 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-[#182635] z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-gray-100">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <span>Carrinho</span>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 bg-gray-100 dark:bg-zinc-800 rounded-full text-gray-600 dark:text-gray-400">
            {cart.length} {cart.length === 1 ? "item" : "itens"}
          </span>
        </div>
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-gray-50/50 dark:bg-black/20">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 space-y-3">
            <ShoppingCart className="h-12 w-12 opacity-20" />
            <p className="text-sm font-medium opacity-60">
              Seu carrinho está vazio
            </p>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.product.id}
              className="group relative flex gap-3 p-3 bg-white dark:bg-[#182635] rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all duration-200"
            >
              {/* Quantity Controls */}
              <div className="flex flex-col items-center justify-center gap-1 bg-gray-50 dark:bg-zinc-800/50 rounded-lg p-1 h-fit my-auto">
                <button
                  onClick={() =>
                    onUpdateQuantity(item.product.id, item.quantidade + 1)
                  }
                  className="p-1 hover:bg-white dark:hover:bg-zinc-700 rounded-md text-gray-500 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                </button>
                <span className="text-sm font-bold w-6 text-center text-gray-700 dark:text-gray-300">
                  {item.quantidade}
                </span>
                <button
                  onClick={() =>
                    onUpdateQuantity(item.product.id, item.quantidade - 1)
                  }
                  className="p-1 hover:bg-white dark:hover:bg-zinc-700 rounded-md text-gray-500 transition-colors"
                >
                  <Minus className="h-3 w-3" />
                </button>
              </div>

              {/* Item Details */}
              <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
                <div className="flex justify-between items-start gap-2">
                  <p className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate leading-tight">
                    {item.product.nome}
                  </p>
                  <button
                    onClick={() => onRemove(item.product.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors p-1 -mr-1 -mt-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-end justify-between mt-2">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {item.quantidade} x R${" "}
                      {item.product.precoVenda.toFixed(2)}
                    </p>
                    {/* Discount Input */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">
                        Desc:
                      </span>
                      <input
                        type="number"
                        className="w-20 h-7 text-xs bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded px-2 text-right focus:outline-none focus:border-primary transition-all"
                        value={item.descontoAplicado}
                        onChange={(e) =>
                          onUpdateDiscount(
                            item.product.id,
                            parseCurrency(e.target.value)
                          )
                        }
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  <span className="font-bold text-base text-gray-900 dark:text-white">
                    R$ {item.subtotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Area */}
      <div className="flex-none bg-gray-50 dark:bg-zinc-900/50 p-4 space-y-4 border-t border-gray-100 dark:border-gray-700 backdrop-blur-sm">
        <div className="space-y-3">
          {/* Payment Method Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 ml-1">
              Forma de Pagamento
            </label>
            <Select
              value={paymentMethod}
              onValueChange={(value) => {
                onPaymentMethodChange(value);
                setPaymentError(false);
              }}
            >
              <SelectTrigger
                className={`h-11 bg-white dark:bg-[#182635] border-gray-200 dark:border-zinc-700 rounded-xl ${paymentError ? "border-red-500 ring-1 ring-red-500" : ""
                  }`}
              >
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                <SelectItem value="debito">Cartão de Débito</SelectItem>
                <SelectItem value="credito">Cartão de Crédito</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cash Payment Inputs */}
          {paymentMethod === "dinheiro" &&
            setValorRecebido &&
            valorRecebido !== undefined && (
              <div className="bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100 dark:border-blue-900/20 space-y-3 animate-in slide-in-from-top-2">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium text-blue-700 dark:text-blue-300">
                      Recebido
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 text-sm">
                        R$
                      </span>
                      <Input
                        type="text"
                        inputMode="decimal"
                        autoFocus
                        placeholder="0,00"
                        value={valorRecebido}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            onFinalize();
                          }
                        }}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (/^[\d,.]*$/.test(value)) {
                            setValorRecebido(value);
                          }
                        }}
                        className="pl-9 h-10 bg-white dark:bg-[#182635] border-blue-200 dark:border-blue-800 focus-visible:ring-blue-500"
                      />
                    </div>
                  </div>

                  {troco !== null && troco !== undefined && (
                    <div className="text-right space-y-0.5">
                      <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                        Troco
                      </span>
                      <p
                        className={`text-xl font-bold ${troco < 0
                            ? "text-red-500"
                            : "text-blue-600 dark:text-blue-400"
                          }`}
                      >
                        R$ {troco.toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
        </div>

        {/* Total Display */}
        <div className="flex items-end justify-between pt-2">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Total a Pagar
          </span>
          <span className="text-3xl font-bold text-green-600 dark:text-green-400 tracking-tight">
            R$ {total.toFixed(2)}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-4 gap-3">
          <Button
            variant="outline"
            onClick={onClear}
            disabled={finalizing || cart.length === 0}
            className="col-span-1 h-14 rounded-xl border-gray-200 dark:border-zinc-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-900/20 transition-colors"
            title="Limpar Carrinho"
          >
            <Trash2 className="h-5 w-5" />
          </Button>

          <InteractiveHoverButton
            id="btn-finalizar-venda"
            onClick={onFinalize}
            className="col-span-3 h-14 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-lg shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={
              finalizing ||
              isOffline ||
              cart.length === 0 ||
              (paymentMethod === "dinheiro" &&
                (valorRecebido === "" ||
                  parseCurrency(valorRecebido || "0") < total))
            }
          >
            <span className="flex items-center justify-center gap-2">
              {finalizing ? (
                "Processando..."
              ) : isOffline ? (
                "Sem Conexão"
              ) : (
                <>
                  <DollarSign className="h-5 w-5" />
                  Finalizar (F12)
                </>
              )}
            </span>
          </InteractiveHoverButton>
        </div>
      </div>
    </div>
  );
}
