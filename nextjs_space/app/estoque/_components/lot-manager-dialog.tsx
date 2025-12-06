import { AnimatedLoadingSkeleton } from "@/components/ui/loading";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { Plus, Calendar } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { parseCurrency } from "@/lib/utils";

interface Lote {
  id: string;
  numeroLote: string;
  dataValidade: string | null;
  quantidade: number;
  precoCompra: number;
  status?: string;
  createdAt: string;
  dataCompra?: string;
}

interface Product {
  id: string;
  nome: string;
}

interface LotManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

export function LotManagerDialog({
  open,
  onOpenChange,
  product,
}: LotManagerDialogProps) {
  const [productLots, setProductLots] = useState<Lote[]>([]);
  const [loadingLots, setLoadingLots] = useState(false);
  const [hideFinishedLots, setHideFinishedLots] = useState(true);
  const [showNewLoteForm, setShowNewLoteForm] = useState(false);
  const [creatingLote, setCreatingLote] = useState(false);
  const [newLoteData, setNewLoteData] = useState({
    numeroLote: "",
    dataValidade: "",
    quantidade: "",
    precoCompra: "",
    dataCompra: "",
  });

  useEffect(() => {
    if (open && product) {
      fetchProductLots(product.id);
      setShowNewLoteForm(false);
      setNewLoteData({
        numeroLote: "",
        dataValidade: "",
        quantidade: "",
        precoCompra: "",
        dataCompra: "",
      });
    }
  }, [open, product]);

  const fetchProductLots = async (productId: string) => {
    setLoadingLots(true);
    setProductLots([]);
    try {
      const response = await fetch(`/api/admin/lotes?produtoId=${productId}`);
      const data = await response.json();
      if (response.ok) {
        const sortedLots = Array.isArray(data)
          ? data.sort((a: any, b: any) => {
              if (!a.dataValidade) return 1;
              if (!b.dataValidade) return -1;
              return (
                new Date(a.dataValidade).getTime() -
                new Date(b.dataValidade).getTime()
              );
            })
          : [];
        setProductLots(sortedLots);
      } else {
        toast({
          title: "Erro",
          description: "Erro ao buscar lotes.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao buscar lotes:", error);
    } finally {
      setLoadingLots(false);
    }
  };

  const handleCreateLote = async () => {
    if (!product || !newLoteData.quantidade) return;

    setCreatingLote(true);
    try {
      const response = await fetch("/api/admin/lotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produtoId: product.id,
          numeroLote: newLoteData.numeroLote,
          dataValidade: newLoteData.dataValidade || null,
          quantidade: parseInt(newLoteData.quantidade),
          precoCompra: newLoteData.precoCompra
            ? parseCurrency(newLoteData.precoCompra)
            : 0,
          dataCompra: newLoteData.dataCompra || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar lote");
      }

      toast({
        title: "Sucesso",
        description: "Lote criado com sucesso!",
      });

      fetchProductLots(product.id);
      setNewLoteData({
        numeroLote: "",
        dataValidade: "",
        quantidade: "",
        precoCompra: "",
        dataCompra: "",
      });
      setShowNewLoteForm(false);
    } catch (error) {
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Erro ao criar lote",
        variant: "destructive",
      });
    } finally {
      setCreatingLote(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-gray-100">
            Lotes: {product?.nome}
          </DialogTitle>
          <DialogDescription className="text-gray-500 dark:text-gray-400">
            Gerenciamento de validade e lotes ativos.
          </DialogDescription>
        </DialogHeader>

        {showNewLoteForm ? (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="numeroLote"
                  className="text-gray-700 dark:text-gray-300"
                >
                  Número do Lote (Opcional)
                </Label>
                <Input
                  id="numeroLote"
                  value={newLoteData.numeroLote}
                  onChange={(e) =>
                    setNewLoteData({
                      ...newLoteData,
                      numeroLote: e.target.value,
                    })
                  }
                  placeholder="Gerado automaticamente"
                  className="bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="quantidadeLote"
                  className="text-gray-700 dark:text-gray-300"
                >
                  Quantidade
                </Label>
                <Input
                  id="quantidadeLote"
                  type="number"
                  value={newLoteData.quantidade}
                  onChange={(e) =>
                    setNewLoteData({
                      ...newLoteData,
                      quantidade: e.target.value,
                    })
                  }
                  placeholder="Qtd"
                  className="bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="dataCompraLote"
                  className="text-gray-700 dark:text-gray-300"
                >
                  Data Compra
                </Label>
                <Input
                  id="dataCompraLote"
                  type="date"
                  value={newLoteData.dataCompra}
                  onChange={(e) =>
                    setNewLoteData({
                      ...newLoteData,
                      dataCompra: e.target.value,
                    })
                  }
                  className="bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="validadeLote"
                  className="text-gray-700 dark:text-gray-300"
                >
                  Validade
                </Label>
                <Input
                  id="validadeLote"
                  type="date"
                  value={newLoteData.dataValidade}
                  onChange={(e) =>
                    setNewLoteData({
                      ...newLoteData,
                      dataValidade: e.target.value,
                    })
                  }
                  className="bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="custoLote"
                  className="text-gray-700 dark:text-gray-300"
                >
                  Custo Unit. (R$)
                </Label>
                <Input
                  id="custoLote"
                  type="number"
                  step="0.01"
                  value={newLoteData.precoCompra}
                  onChange={(e) =>
                    setNewLoteData({
                      ...newLoteData,
                      precoCompra: e.target.value,
                    })
                  }
                  placeholder="0.00"
                  className="bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <InteractiveHoverButton
                className="bg-white hover:bg-gray-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-zinc-700"
                onClick={() => setShowNewLoteForm(false)}
              >
                Cancelar
              </InteractiveHoverButton>
              <InteractiveHoverButton
                onClick={handleCreateLote}
                disabled={creatingLote}
                className="bg-primary text-primary-foreground border-primary hover:bg-primary/90"
              >
                {creatingLote ? "Salvando..." : "Salvar Lote"}
              </InteractiveHoverButton>
            </div>
          </div>
        ) : (
          <>
            {loadingLots ? (
              <div className="py-4">
                <AnimatedLoadingSkeleton />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hideFinishedLots"
                      checked={hideFinishedLots}
                      onCheckedChange={(checked) =>
                        setHideFinishedLots(checked as boolean)
                      }
                      className="border-gray-300 dark:border-zinc-600 data-[state=checked]:bg-primary dark:data-[state=checked]:bg-primary"
                    />
                    <Label
                      htmlFor="hideFinishedLots"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-700 dark:text-gray-300"
                    >
                      Ocultar finalizados
                    </Label>
                  </div>
                  <InteractiveHoverButton
                    onClick={() => setShowNewLoteForm(true)}
                    className="gap-2 bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                  >
                    <span className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Novo Lote
                    </span>
                  </InteractiveHoverButton>
                </div>
                <div className="border border-gray-200 dark:border-zinc-800 rounded-md overflow-hidden max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 border-gray-200 dark:border-zinc-700">
                        <TableHead className="text-gray-700 dark:text-gray-300">
                          Lote
                        </TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">
                          Data Compra
                        </TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">
                          Validade
                        </TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">
                          Custo Total
                        </TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">
                          Qtd.
                        </TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">
                          Status
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productLots.filter((lote) =>
                        hideFinishedLots
                          ? lote.status !== "esgotado" && lote.quantidade > 0
                          : true
                      ).length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center py-4 text-gray-500 dark:text-gray-400"
                          >
                            Nenhum lote encontrado.
                          </TableCell>
                        </TableRow>
                      ) : (
                        productLots
                          .filter((lote) =>
                            hideFinishedLots
                              ? lote.status !== "esgotado" &&
                                lote.quantidade > 0
                              : true
                          )
                          .map((lote) => {
                            // Lógica de Status simplificada
                            let statusBadge;
                            if (lote.status === "vencido") {
                              statusBadge = (
                                <Badge
                                  variant="destructive"
                                  className="text-[10px] h-5 whitespace-nowrap"
                                >
                                  Vencido
                                </Badge>
                              );
                            } else if (lote.status === "proximo_vencimento") {
                              statusBadge = (
                                <Badge className="bg-yellow-500 text-[10px] h-5 whitespace-nowrap">
                                  Vence Logo
                                </Badge>
                              );
                            } else if (!lote.dataValidade) {
                              statusBadge = (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] h-5 whitespace-nowrap bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300"
                                >
                                  S/ Validade
                                </Badge>
                              );
                            } else if (
                              lote.quantidade === 0 ||
                              lote.status === "esgotado"
                            ) {
                              statusBadge = (
                                <Badge
                                  variant="secondary"
                                  className="bg-gray-200 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 text-[10px] h-5 whitespace-nowrap"
                                >
                                  Finalizado
                                </Badge>
                              );
                            } else {
                              statusBadge = (
                                <Badge
                                  variant="outline"
                                  className="text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 text-[10px] h-5 whitespace-nowrap"
                                >
                                  Normal
                                </Badge>
                              );
                            }

                            return (
                              <TableRow
                                key={lote.id}
                                className="border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/50"
                              >
                                <TableCell className="font-mono text-xs text-gray-600 dark:text-gray-300">
                                  {lote.numeroLote}
                                </TableCell>
                                <TableCell className="text-gray-600 dark:text-gray-300">
                                  {lote.dataCompra || lote.createdAt
                                    ? new Date(
                                        lote.dataCompra || lote.createdAt
                                      ).toLocaleDateString("pt-BR")
                                    : "-"}
                                </TableCell>
                                <TableCell>
                                  {lote.dataValidade ? (
                                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                                      <Calendar className="h-3 w-3 text-gray-400" />
                                      {new Date(
                                        lote.dataValidade
                                      ).toLocaleDateString("pt-BR")}
                                    </div>
                                  ) : (
                                    <span className="text-gray-500 dark:text-gray-400 italic">
                                      Indeterminado
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-gray-600 dark:text-gray-300">
                                  R${" "}
                                  {(
                                    Number(lote.precoCompra || 0) *
                                    lote.quantidade
                                  ).toFixed(2)}
                                </TableCell>
                                <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                                  {lote.quantidade}
                                </TableCell>
                                <TableCell>{statusBadge}</TableCell>
                              </TableRow>
                            );
                          })
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end">
                  <InteractiveHoverButton
                    className="bg-white hover:bg-gray-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-zinc-700"
                    onClick={() => onOpenChange(false)}
                  >
                    Fechar
                  </InteractiveHoverButton>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
