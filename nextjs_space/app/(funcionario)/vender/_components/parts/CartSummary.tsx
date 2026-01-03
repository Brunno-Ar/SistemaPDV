import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  DollarSign,
  CreditCard,
  Smartphone,
  Banknote,
  X,
  Check,
} from "lucide-react";
import { CartItem, PaymentItem } from "@/hooks/use-pos";
import { parseCurrency } from "@/lib/utils";

interface CartSummaryProps {
  cart: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onUpdateDiscount: (productId: string, discount: number) => void;
  // Multi-payment props
  payments: PaymentItem[];
  onAddPayment: (method: PaymentItem["method"], amount: number) => boolean;
  onRemovePayment: (paymentId: string) => void;
  valorRestante: number;
  trocoTotal: number;
  onFinalize: () => void;
  onClear: () => void;
  isOffline: boolean;
  finalizing: boolean;
  paymentError: boolean;
  setPaymentError: (error: boolean) => void;
  total: number;
}

// Labels e ícones para métodos de pagamento
const PAYMENT_METHODS = {
  dinheiro: {
    label: "Dinheiro",
    icon: Banknote,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    borderColor: "border-green-200 dark:border-green-800",
  },
  pix: {
    label: "PIX",
    icon: Smartphone,
    color: "text-cyan-600",
    bgColor: "bg-cyan-50 dark:bg-cyan-900/20",
    borderColor: "border-cyan-200 dark:border-cyan-800",
  },
  debito: {
    label: "Débito",
    icon: CreditCard,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  credito: {
    label: "Crédito",
    icon: CreditCard,
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
    borderColor: "border-purple-200 dark:border-purple-800",
  },
} as const;

export function CartSummary({
  cart,
  onUpdateQuantity,
  onRemove,
  onUpdateDiscount,
  payments,
  onAddPayment,
  onRemovePayment,
  valorRestante,
  trocoTotal,
  onFinalize,
  onClear,
  isOffline,
  finalizing,
  paymentError,
  setPaymentError,
  total,
}: CartSummaryProps) {
  // Estado para o modal de input de valor
  const [selectedMethod, setSelectedMethod] = useState<
    PaymentItem["method"] | null
  >(null);
  const [inputValue, setInputValue] = useState("");

  // Quando selecionar um método, preenche com o valor restante
  useEffect(() => {
    if (selectedMethod) {
      setInputValue(valorRestante.toFixed(2).replace(".", ","));
    }
  }, [selectedMethod, valorRestante]);

  const handleMethodClick = (method: PaymentItem["method"]) => {
    // Se não há mais nada a pagar, ignora (exceto dinheiro que pode dar troco)
    if (valorRestante <= 0 && method !== "dinheiro") {
      return;
    }

    // Sempre abre o input para digitar o valor - mais intuitivo para o usuário
    setSelectedMethod(method);
    setInputValue(valorRestante.toFixed(2).replace(".", ","));
  };

  const handleAddPayment = () => {
    if (!selectedMethod) return;

    const amount = parseCurrency(inputValue);
    if (amount <= 0) {
      return;
    }

    const success = onAddPayment(selectedMethod, amount);
    if (success) {
      setSelectedMethod(null);
      setInputValue("");
      setPaymentError(false);
    }
  };

  const handleCancelInput = () => {
    setSelectedMethod(null);
    setInputValue("");
  };

  // Calcular se pode finalizar (restante <= 0 OU pagamentos cobrem tudo)
  const canFinalize =
    cart.length > 0 && payments.length > 0 && valorRestante <= 0.01;

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
                      <DiscountInput
                        value={item.descontoAplicado}
                        onChange={(val) =>
                          onUpdateDiscount(item.product.id, val)
                        }
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

      {/* Footer Area - Payment Section */}
      <div className="flex-none bg-gray-50 dark:bg-zinc-900/50 p-4 space-y-4 border-t border-gray-100 dark:border-gray-700 backdrop-blur-sm">
        {/* Lista de pagamentos adicionados */}
        {payments.length > 0 && (
          <div className="space-y-2 animate-in slide-in-from-top-2">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Pagamentos Adicionados:
            </p>
            <div className="space-y-1.5">
              {payments.map((payment) => {
                const config = PAYMENT_METHODS[payment.method];
                const Icon = config.icon;
                return (
                  <div
                    key={payment.id}
                    className={`flex items-center justify-between p-2 rounded-lg border ${config.bgColor} ${config.borderColor}`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${config.color}`} />
                      <span className={`text-sm font-medium ${config.color}`}>
                        {config.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-800 dark:text-gray-200">
                        R$ {payment.amount.toFixed(2)}
                      </span>
                      <button
                        onClick={() => onRemovePayment(payment.id)}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full text-gray-400 hover:text-red-500 transition-colors"
                        title="Remover"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Troco se houver */}
            {trocoTotal > 0 && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                  💵 Troco
                </span>
                <span className="font-bold text-amber-700 dark:text-amber-300">
                  R$ {trocoTotal.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Botões de método de pagamento ou Input de valor */}
        {selectedMethod ? (
          // Input para valor customizado
          <div
            className={`p-3 rounded-xl border ${PAYMENT_METHODS[selectedMethod].bgColor} ${PAYMENT_METHODS[selectedMethod].borderColor} space-y-3 animate-in slide-in-from-top-2`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(() => {
                  const Icon = PAYMENT_METHODS[selectedMethod].icon;
                  return (
                    <Icon
                      className={`h-5 w-5 ${PAYMENT_METHODS[selectedMethod].color}`}
                    />
                  );
                })()}
                <span
                  className={`font-medium ${PAYMENT_METHODS[selectedMethod].color}`}
                >
                  {PAYMENT_METHODS[selectedMethod].label}
                </span>
              </div>
              <button
                onClick={handleCancelInput}
                className="p-1 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-full"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  R$
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  autoFocus
                  placeholder="0,00"
                  value={inputValue}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddPayment();
                    } else if (e.key === "Escape") {
                      handleCancelInput();
                    }
                  }}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^[\d,.]*$/.test(value)) {
                      setInputValue(value);
                    }
                  }}
                  className="pl-9 h-10 bg-white dark:bg-[#182635]"
                />
              </div>
              <Button
                onClick={handleAddPayment}
                className="h-10 px-4 bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>

            {selectedMethod === "dinheiro" && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                💡 Para dinheiro, você pode informar mais que o restante. O
                excedente será troco.
              </p>
            )}
          </div>
        ) : (
          // Botões de seleção de método
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {payments.length === 0
                  ? "Forma de Pagamento"
                  : "Adicionar Pagamento"}
              </p>
              {valorRestante > 0 && payments.length > 0 && (
                <span className="text-xs font-bold text-red-500">
                  Restante: R$ {valorRestante.toFixed(2)}
                </span>
              )}
            </div>

            <div
              className={`grid grid-cols-4 gap-2 ${
                paymentError ? "animate-shake" : ""
              }`}
            >
              {(
                Object.keys(PAYMENT_METHODS) as Array<
                  keyof typeof PAYMENT_METHODS
                >
              ).map((method) => {
                const config = PAYMENT_METHODS[method];
                const Icon = config.icon;
                const isDisabled = valorRestante <= 0 && method !== "dinheiro";

                return (
                  <button
                    key={method}
                    onClick={() => handleMethodClick(method)}
                    disabled={isDisabled || cart.length === 0}
                    className={`
                      flex flex-col items-center justify-center gap-1 p-3 rounded-xl border-2 transition-all
                      ${
                        isDisabled || cart.length === 0
                          ? "opacity-40 cursor-not-allowed border-gray-200 dark:border-zinc-700"
                          : `${config.borderColor} hover:scale-105 hover:shadow-md cursor-pointer ${config.bgColor}`
                      }
                      ${
                        paymentError && !isDisabled
                          ? "border-red-500 ring-2 ring-red-500/30"
                          : ""
                      }
                    `}
                  >
                    <Icon
                      className={`h-5 w-5 ${
                        isDisabled ? "text-gray-400" : config.color
                      }`}
                    />
                    <span
                      className={`text-xs font-medium ${
                        isDisabled ? "text-gray-400" : config.color
                      }`}
                    >
                      {config.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Total Display */}
        <div className="flex items-end justify-between pt-2">
          <div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block">
              Total a Pagar
            </span>
            {payments.length > 0 && valorRestante > 0 && (
              <span className="text-xs text-red-500 font-medium">
                Falta: R$ {valorRestante.toFixed(2)}
              </span>
            )}
          </div>
          <span
            className={`text-3xl font-bold tracking-tight ${
              canFinalize
                ? "text-green-600 dark:text-green-400"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
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
            disabled={finalizing || isOffline || !canFinalize}
          >
            <span className="flex items-center justify-center gap-2">
              {finalizing ? (
                "Processando..."
              ) : isOffline ? (
                "Sem Conexão"
              ) : !canFinalize ? (
                payments.length === 0 ? (
                  "Adicione Pagamento"
                ) : (
                  `Falta R$ ${valorRestante.toFixed(2)}`
                )
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

interface DiscountInputProps {
  value: number;
  onChange: (value: number) => void;
}

function DiscountInput({ value, onChange }: DiscountInputProps) {
  // Estado local para gerenciar o que o usuário digita (pode ser "2," "2,5" etc)
  const [localValue, setLocalValue] = useState<string>("");

  // Sincroniza o estado local quando o valor externo muda
  useEffect(() => {
    // Se o valor externo é 0 e o local é vazio, mantemos vazio para placeholder aparecer
    if (value === 0 && localValue === "") return;

    const numericLocal = parseCurrency(localValue);
    // Só atualiza se houver diferença real numérica para evitar sobrescrever enquanto digita
    if (Math.abs(numericLocal - value) > 0.009) {
      setLocalValue(value === 0 ? "" : value.toFixed(2).replace(".", ","));
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Permite digitar apenas números, vírgula e ponto
    const newValue = e.target.value.replace(/[^0-9,.]/g, "");
    setLocalValue(newValue);
  };

  const handleBlur = () => {
    const numeric = parseCurrency(localValue);
    onChange(numeric);
    // Formata bonitinho ao sair
    setLocalValue(numeric === 0 ? "" : numeric.toFixed(2).replace(".", ","));
  };

  return (
    <Input
      type="text"
      inputMode="decimal"
      className="w-20 h-7 text-xs bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded px-2 text-right focus:outline-none focus:border-primary transition-all p-0"
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onClick={(e) => e.stopPropagation()}
      placeholder="0,00"
    />
  );
}
