"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ShoppingCart,
  ArrowDownCircle,
  AlertTriangle,
  Wrench,
  Search,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp,
  ArrowRightLeft,
  DollarSign,
  ArrowUpCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "@/hooks/use-toast";

interface MovementItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discount?: number;
}

interface UnifiedMovement {
  id: string;
  type:
    | "VENDA"
    | "ENTRADA"
    | "AJUSTE_QUEBRA"
    | "AJUSTE_INVENTARIO"
    | "DEVOLUCAO"
    | "ABERTURA"
    | "SANGRIA"
    | "SUPRIMENTO"
    | "FECHAMENTO";
  date: string;
  user: string;
  // Fields for Sales
  totalValue?: number;
  items?: MovementItem[];
  paymentMethod?: string;
  amountPaid?: number;
  change?: number;
  // Fields for Stock Movements
  productName?: string;
  quantity?: number;
  reason?: string;
}

interface MovimentacoesClientProps {
  companyId?: string;
}

export default function MovimentacoesClient({
  companyId,
}: MovimentacoesClientProps) {
  const [movements, setMovements] = useState<UnifiedMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("TODOS");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchMovements();
  }, [typeFilter, startDate, endDate]);

  const fetchMovements = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== "TODOS") params.append("type", typeFilter);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(
        `/api/admin/movimentacoes?${params.toString()}${
          companyId ? `&companyId=${companyId}` : ""
        }`
      );
      const data = await response.json();

      if (!response.ok)
        throw new Error(data.error || "Erro ao buscar movimentações");

      setMovements(data);
    } catch (error) {
      console.error("Erro:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as movimentações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredMovements = movements.filter((mov) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesUser = mov.user.toLowerCase().includes(searchLower);
    const matchesProduct =
      mov.productName?.toLowerCase().includes(searchLower) ||
      mov.items?.some((item) =>
        item.productName.toLowerCase().includes(searchLower)
      );

    return matchesUser || matchesProduct;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "VENDA":
        return <ShoppingCart className="h-5 w-5 text-blue-500" />;
      case "ENTRADA":
        return <ArrowDownCircle className="h-5 w-5 text-green-500" />;
      case "AJUSTE_QUEBRA":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "AJUSTE_INVENTARIO":
        return <Wrench className="h-5 w-5 text-gray-500" />;
      case "ABERTURA":
        return <DollarSign className="h-5 w-5 text-blue-500" />;
      case "SANGRIA":
        return <ArrowUpCircle className="h-5 w-5 text-red-500" />;
      case "SUPRIMENTO":
        return <ArrowDownCircle className="h-5 w-5 text-green-500" />;
      case "FECHAMENTO":
        return <DollarSign className="h-5 w-5 text-purple-500" />;
      default:
        return <Wrench className="h-5 w-5 text-gray-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "VENDA":
        return "Venda";
      case "ENTRADA":
        return "Entrada de Estoque";
      case "AJUSTE_QUEBRA":
        return "Quebra/Perda";
      case "AJUSTE_INVENTARIO":
        return "Ajuste Manual";
      case "DEVOLUCAO":
        return "Devolução";
      case "ABERTURA":
        return "Abertura de Caixa";
      case "SANGRIA":
        return "Sangria de Caixa";
      case "SUPRIMENTO":
        return "Suprimento de Caixa";
      case "FECHAMENTO":
        return "Fechamento de Caixa";
      default:
        return type;
    }
  };

  // Movement Dialog State
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [movementFormData, setMovementFormData] = useState({
    produtoId: "",
    loteId: "sem_lote", // "sem_lote" ou ID do lote
    tipo: "ENTRADA", // ENTRADA, SAIDA, PERDA, AJUSTE
    quantidade: "",
    motivo: "",
  });
  const [products, setProducts] = useState<any[]>([]);
  const [lotes, setLotes] = useState<any[]>([]);

  useEffect(() => {
    fetchProducts();
    fetchLotes();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/admin/products");
      const data = await response.json();
      if (Array.isArray(data)) setProducts(data);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
    }
  };

  const fetchLotes = async () => {
    try {
      const response = await fetch("/api/admin/lotes");
      const data = await response.json();
      if (Array.isArray(data)) setLotes(data);
    } catch (error) {
      console.error("Erro ao carregar lotes:", error);
    }
  };

  const handleOpenMovementDialog = () => {
    setMovementFormData({
      produtoId: "",
      loteId: "sem_lote",
      tipo: "ENTRADA",
      quantidade: "",
      motivo: "",
    });
    setMovementDialogOpen(true);
  };

  const handleMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !movementFormData.produtoId ||
      !movementFormData.tipo ||
      !movementFormData.quantidade
    ) {
      toast({
        title: "Erro",
        description: "Preencha os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    // Validação de Lote Obrigatório para Saídas
    if (
      (movementFormData.tipo === "SAIDA" ||
        movementFormData.tipo === "PERDA") &&
      movementFormData.loteId === "sem_lote"
    ) {
      toast({
        title: "Erro",
        description: "Selecione um Lote para registrar Saída ou Perda.",
        variant: "destructive",
      });
      return;
    }

    const qtd = Number(movementFormData.quantidade);
    if (qtd <= 0) {
      toast({
        title: "Erro",
        description: "Quantidade deve ser maior que zero",
        variant: "destructive",
      });
      return;
    }

    try {
      let apiTipo = "ENTRADA";
      let operacao = "ADICIONAR";

      if (movementFormData.tipo === "ENTRADA") {
        apiTipo = "ENTRADA";
        operacao = "ADICIONAR";
      } else if (movementFormData.tipo === "SAIDA") {
        apiTipo = "AJUSTE_INVENTARIO";
        operacao = "REMOVER";
      } else if (movementFormData.tipo === "PERDA") {
        apiTipo = "AJUSTE_QUEBRA";
        operacao = "REMOVER";
      } else if (movementFormData.tipo === "AJUSTE") {
        apiTipo = "AJUSTE_INVENTARIO";
        operacao = "ADICIONAR";
      }

      const body = {
        produtoId: movementFormData.produtoId,
        loteId:
          movementFormData.loteId === "sem_lote"
            ? undefined
            : movementFormData.loteId,
        tipo: apiTipo,
        operacao,
        quantidade: qtd,
        motivo: movementFormData.motivo,
      };

      const response = await fetch("/api/admin/movimentacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar movimentação");
      }

      toast({
        title: "Sucesso",
        description: "Movimentação registrada com sucesso",
      });

      setMovementDialogOpen(false);
      fetchMovements(); // Atualizar lista
    } catch (error) {
      toast({
        title: "Erro",
        description:
          error instanceof Error
            ? error.message
            : "Erro ao registrar movimentação",
        variant: "destructive",
      });
    }
  };

  const availableLotes = lotes.filter(
    (l) => l.produtoId === movementFormData.produtoId
  );

  return (
    <div className="space-y-6">
      <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-gray-900 dark:text-gray-100">
                Central de Movimentações
              </CardTitle>
              <CardDescription className="text-gray-500 dark:text-gray-400">
                Visualize vendas, entradas e ajustes de estoque em uma linha do
                tempo unificada.
              </CardDescription>
            </div>
            <InteractiveHoverButton
              onClick={handleOpenMovementDialog}
              className="bg-cta-bg text-white border-cta-bg hover:bg-cta-bg/90"
            >
              <span className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4" />
                Nova Movimentação
              </span>
            </InteractiveHoverButton>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por usuário ou produto..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="w-full md:w-[200px]">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de Movimentação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todas</SelectItem>
                  <SelectItem value="VENDA">Vendas</SelectItem>
                  <SelectItem value="ENTRADA">Entradas</SelectItem>
                  <SelectItem value="PERDA">Perdas/Quebras</SelectItem>
                  <SelectItem value="AJUSTE">Ajustes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[150px]"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[150px]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Carregando movimentações...
          </div>
        ) : filteredMovements.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 border rounded-lg bg-gray-50 dark:bg-zinc-800 dark:border-zinc-700">
            Nenhuma movimentação encontrada no período.
          </div>
        ) : (
          filteredMovements.map((mov) => (
            <Card
              key={mov.id}
              className="overflow-hidden bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800"
            >
              {mov.type === "VENDA" ? (
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1" className="border-none">
                    <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                          {getIcon(mov.type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                              Venda
                            </h3>
                            <Badge
                              variant="outline"
                              className="font-mono text-xs"
                            >
                              #{mov.id.slice(-6).toUpperCase()}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            <span>
                              {format(new Date(mov.date), "dd/MM/yyyy HH:mm", {
                                locale: ptBR,
                              })}
                            </span>
                            <span>•</span>
                            <span>{mov.user}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Total
                          </p>
                          <p className="font-bold text-green-600 dark:text-green-400 text-lg">
                            {formatCurrency(mov.totalValue || 0)}
                          </p>
                        </div>
                        <AccordionTrigger className="hover:no-underline py-0" />
                      </div>
                    </div>
                    <AccordionContent>
                      <div className="bg-gray-50 dark:bg-zinc-800 p-4 border-t dark:border-zinc-700">
                        <div className="grid gap-2">
                          <div className="font-medium text-sm text-gray-500 dark:text-gray-400 mb-2">
                            Itens da Venda
                          </div>
                          {mov.items?.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between text-sm items-center text-gray-700 dark:text-gray-300"
                            >
                              <div className="flex flex-col">
                                <span>
                                  {item.quantity}x {item.productName}
                                </span>
                                {item.discount && item.discount > 0 ? (
                                  <span className="text-xs text-green-600 dark:text-green-400">
                                    Desconto: -{formatCurrency(item.discount)}
                                  </span>
                                ) : null}
                              </div>
                              <span className="font-mono">
                                {formatCurrency(item.subtotal)}
                              </span>
                            </div>
                          ))}
                          <div className="mt-2 pt-2 border-t dark:border-zinc-700 space-y-1">
                            <div className="flex justify-between text-sm font-medium text-gray-900 dark:text-gray-100">
                              <span>Forma de Pagamento</span>
                              <span className="capitalize">
                                {mov.paymentMethod}
                              </span>
                            </div>
                            {mov.amountPaid !== undefined && (
                              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                <span>Valor Pago</span>
                                <span>{formatCurrency(mov.amountPaid)}</span>
                              </div>
                            )}
                            {mov.change !== undefined && (
                              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                <span>Troco</span>
                                <span>{formatCurrency(mov.change)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              ) : (
                <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-2 rounded-full ${
                        mov.type === "ENTRADA"
                          ? "bg-green-100 dark:bg-green-900/30"
                          : mov.type === "AJUSTE_QUEBRA"
                          ? "bg-red-100 dark:bg-red-900/30"
                          : "bg-gray-100 dark:bg-zinc-800"
                      }`}
                    >
                      {getIcon(mov.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                          {getTypeLabel(mov.type)}
                        </h3>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <span>
                          {format(new Date(mov.date), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })}
                        </span>
                        <span>•</span>
                        <span>{mov.user}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {mov.productName}
                      </span>
                      {[
                        "ABERTURA",
                        "SANGRIA",
                        "SUPRIMENTO",
                        "FECHAMENTO",
                      ].includes(mov.type) ? (
                        <span
                          className={`font-bold ${
                            ["ABERTURA", "SUPRIMENTO"].includes(mov.type)
                              ? "text-green-600 dark:text-green-400"
                              : mov.type === "SANGRIA"
                              ? "text-red-600 dark:text-red-400"
                              : "text-purple-600 dark:text-purple-400"
                          }`}
                        >
                          {formatCurrency(mov.totalValue || 0)}
                        </span>
                      ) : (
                        <Badge
                          variant={
                            mov.type === "ENTRADA" ? "default" : "destructive"
                          }
                        >
                          {mov.type === "ENTRADA" ? "+" : "-"}
                          {Math.abs(mov.quantity || 0)}
                        </Badge>
                      )}
                    </div>
                    {mov.reason && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic max-w-md text-right">
                        "{mov.reason}"
                      </p>
                    )}
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      <Dialog open={movementDialogOpen} onOpenChange={setMovementDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nova Movimentação</DialogTitle>
            <DialogDescription>
              Registre entradas, saídas ou ajustes manuais no estoque.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleMovementSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="movProduto">Produto</Label>
              <Select
                value={movementFormData.produtoId}
                onValueChange={(value) =>
                  setMovementFormData({
                    ...movementFormData,
                    produtoId: value,
                    loteId: "sem_lote",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.nome} (SKU: {product.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {movementFormData.produtoId && (
              <div className="space-y-2">
                <Label htmlFor="movLote">
                  Lote{" "}
                  {movementFormData.tipo === "SAIDA" ||
                  movementFormData.tipo === "PERDA"
                    ? "(Obrigatório)"
                    : "(Opcional)"}
                </Label>
                <Select
                  value={movementFormData.loteId}
                  onValueChange={(value) =>
                    setMovementFormData({ ...movementFormData, loteId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um lote" />
                  </SelectTrigger>
                  <SelectContent>
                    {movementFormData.tipo !== "SAIDA" &&
                      movementFormData.tipo !== "PERDA" && (
                        <SelectItem value="sem_lote">
                          Sem Lote (Ajuste Geral)
                        </SelectItem>
                      )}
                    {availableLotes.map((lote) => (
                      <SelectItem key={lote.id} value={lote.id}>
                        {lote.numeroLote} (Qtd: {lote.quantidade}) - Val:{" "}
                        {lote.dataValidade
                          ? new Date(lote.dataValidade).toLocaleDateString(
                              "pt-BR"
                            )
                          : "N/A"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="movTipo">Tipo</Label>
                <Select
                  value={movementFormData.tipo}
                  onValueChange={(value) =>
                    setMovementFormData({ ...movementFormData, tipo: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ENTRADA">Entrada (+)</SelectItem>
                    <SelectItem value="SAIDA">Saída (-)</SelectItem>
                    <SelectItem value="PERDA">Perda/Quebra (-)</SelectItem>
                    <SelectItem value="AJUSTE">Ajuste (+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="movQuantidade">Quantidade</Label>
                <Input
                  id="movQuantidade"
                  type="number"
                  value={movementFormData.quantidade}
                  onChange={(e) =>
                    setMovementFormData({
                      ...movementFormData,
                      quantidade: e.target.value,
                    })
                  }
                  placeholder="Qtd"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="movMotivo">Motivo (Opcional)</Label>
              <Input
                id="movMotivo"
                value={movementFormData.motivo}
                onChange={(e) =>
                  setMovementFormData({
                    ...movementFormData,
                    motivo: e.target.value,
                  })
                }
                placeholder="Ex: Contagem de estoque, doação, etc."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <InteractiveHoverButton
                type="button"
                className="bg-white hover:bg-gray-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-zinc-700"
                onClick={() => setMovementDialogOpen(false)}
              >
                Cancelar
              </InteractiveHoverButton>
              <InteractiveHoverButton
                type="submit"
                className="bg-cta-bg text-white border-cta-bg hover:bg-cta-bg/90"
              >
                Confirmar
              </InteractiveHoverButton>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
