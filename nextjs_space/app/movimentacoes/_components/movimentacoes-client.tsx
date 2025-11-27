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
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    | "DEVOLUCAO";
  date: string;
  user: string;
  // Fields for Sales
  totalValue?: number;
  items?: MovementItem[];
  paymentMethod?: string;
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
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Central de Movimentações</CardTitle>
          <CardDescription>
            Visualize vendas, entradas e ajustes de estoque em uma linha do
            tempo unificada.
          </CardDescription>
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
          <div className="text-center py-8 text-gray-500">
            Carregando movimentações...
          </div>
        ) : filteredMovements.length === 0 ? (
          <div className="text-center py-8 text-gray-500 border rounded-lg bg-gray-50">
            Nenhuma movimentação encontrada no período.
          </div>
        ) : (
          filteredMovements.map((mov) => (
            <Card key={mov.id} className="overflow-hidden">
              {mov.type === "VENDA" ? (
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1" className="border-none">
                    <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-100 rounded-full">
                          {getIcon(mov.type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">Venda</h3>
                            <Badge
                              variant="outline"
                              className="font-mono text-xs"
                            >
                              #{mov.id.slice(-6).toUpperCase()}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-2">
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
                          <p className="text-sm text-gray-500">Total</p>
                          <p className="font-bold text-green-600 text-lg">
                            {formatCurrency(mov.totalValue || 0)}
                          </p>
                        </div>
                        <AccordionTrigger className="hover:no-underline py-0" />
                      </div>
                    </div>
                    <AccordionContent>
                      <div className="bg-gray-50 p-4 border-t">
                        <div className="grid gap-2">
                          <div className="font-medium text-sm text-gray-500 mb-2">
                            Itens da Venda
                          </div>
                          {mov.items?.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between text-sm items-center"
                            >
                              <div className="flex flex-col">
                                <span>
                                  {item.quantity}x {item.productName}
                                </span>
                                {item.discount && item.discount > 0 ? (
                                  <span className="text-xs text-green-600">
                                    Desconto: -{formatCurrency(item.discount)}
                                  </span>
                                ) : null}
                              </div>
                              <span className="font-mono">
                                {formatCurrency(item.subtotal)}
                              </span>
                            </div>
                          ))}
                          <div className="mt-2 pt-2 border-t flex justify-between text-sm font-medium">
                            <span>Forma de Pagamento</span>
                            <span className="capitalize">
                              {mov.paymentMethod}
                            </span>
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
                          ? "bg-green-100"
                          : mov.type === "AJUSTE_QUEBRA"
                          ? "bg-red-100"
                          : "bg-gray-100"
                      }`}
                    >
                      {getIcon(mov.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">
                          {getTypeLabel(mov.type)}
                        </h3>
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-2">
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
                      <span className="font-medium">{mov.productName}</span>
                      <Badge
                        variant={
                          mov.type === "ENTRADA" ? "default" : "destructive"
                        }
                      >
                        {mov.type === "ENTRADA" ? "+" : "-"}
                        {Math.abs(mov.quantity || 0)}
                      </Badge>
                    </div>
                    {mov.reason && (
                      <p className="text-sm text-gray-500 italic max-w-md text-right">
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
    </div>
  );
}
