"use client";

import { useState, useEffect } from "react";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Package,
  Search,
  Edit,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { AnimatedLoadingSkeleton } from "@/components/ui/loading";
import { parseCurrency } from "@/lib/utils";

interface Product {
  id: string;
  nome: string;
  sku: string;
  estoqueAtual: number;
  estoqueMinimo: number;
}

interface Lote {
  id: string;
  numeroLote: string;
  dataValidade: string | null;
  quantidade: number;
  produtoId: string;
  precoCompra: number;
  createdAt: string;
  produto: {
    nome: string;
    sku: string;
    estoqueAtual: number;
    estoqueMinimo: number;
  };
  status?: string;
  diasParaVencer?: number;
  dataCompra?: string;
}

export default function LotesClient() {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLoteId, setEditingLoteId] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    | "todos"
    | "vencido"
    | "proximo_vencimento"
    | "normal"
    | "sem_validade"
    | "estoque_baixo"
    | "esgotado"
  >("todos");
  const [ordenacao, setOrdenacao] = useState("nome-asc");
  const [hideFinished, setHideFinished] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    produtoId: "",
    numeroLote: "",
    dataValidade: "",
    quantidade: "",
    valorTotalLote: "",
    precoCompra: "",
    dataCompra: "",
  });
  const [semValidade, setSemValidade] = useState(false);

  useEffect(() => {
    fetchLotes();
    fetchProducts();
  }, []);

  // Cálculo automático do Custo Unitário
  useEffect(() => {
    const qtd = parseCurrency(formData.quantidade);
    const total = parseCurrency(formData.valorTotalLote);

    if (!isNaN(qtd) && qtd > 0 && !isNaN(total)) {
      const unitario = total / qtd;
      setFormData((prev) => ({
        ...prev,
        precoCompra: unitario.toFixed(2),
      }));
    } else if (!formData.valorTotalLote) {
      // Se limpar o valor total, limpa o unitário (opcional, mas bom pra UX)
      // Mas se estiver editando e só mudou a quantidade, talvez queira manter?
      // A regra do usuário é: dividir valor do lote pela quantidade.
      // Se não tem valor do lote, não calcula.
    }
  }, [formData.quantidade, formData.valorTotalLote]);

  const fetchLotes = async () => {
    try {
      const response = await fetch("/api/admin/lotes", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao carregar lotes");
      }

      if (Array.isArray(data)) {
        setLotes(data);
      } else {
        setLotes([]);
      }
    } catch (error) {
      console.error("Erro ao carregar lotes:", error);
      setLotes([]);
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Erro ao carregar lotes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/admin/products");
      const data = await response.json();

      if (Array.isArray(data)) {
        setProducts(data);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      setProducts([]);
    }
  };

  const handleOpenDialog = (lote?: Lote) => {
    if (lote) {
      setEditingLoteId(lote.id);
      setFormData({
        produtoId: lote.produtoId,
        numeroLote: lote.numeroLote,
        dataValidade: lote.dataValidade
          ? new Date(lote.dataValidade).toISOString().split("T")[0]
          : "",
        quantidade: lote.quantidade.toString(),
        valorTotalLote: (Number(lote.precoCompra) * lote.quantidade).toFixed(2),
        precoCompra: Number(lote.precoCompra).toFixed(2),
        dataCompra: lote.dataCompra
          ? new Date(lote.dataCompra).toISOString().split("T")[0]
          : "",
      });
      setSemValidade(!lote.dataValidade);
    } else {
      setEditingLoteId(null);
      setFormData({
        produtoId: "",
        numeroLote: "",
        dataValidade: "",
        quantidade: "",
        valorTotalLote: "",
        precoCompra: "",
        dataCompra: "",
      });
      setSemValidade(false);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingLoteId(null);
    setFormData({
      produtoId: "",
      numeroLote: "",
      dataValidade: "",
      quantidade: "",
      valorTotalLote: "",
      precoCompra: "",
      dataCompra: "",
    });
    setSemValidade(false);
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      handleCloseDialog();
    } else {
      setDialogOpen(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.produtoId ||
      (!semValidade && !formData.dataValidade) ||
      !formData.quantidade
    ) {
      toast({
        title: "Erro",
        description: "Preencha os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    const quantidade = parseInt(formData.quantidade);

    if (quantidade <= 0) {
      toast({
        title: "Erro",
        description: "Quantidade deve ser maior que zero",
        variant: "destructive",
      });
      return;
    }

    try {
      const url = "/api/admin/lotes";
      const method = editingLoteId ? "PUT" : "POST";
      const body = {
        id: editingLoteId,
        produtoId: formData.produtoId,
        numeroLote: formData.numeroLote,
        dataValidade: semValidade ? null : formData.dataValidade,
        quantidade,
        precoCompra: parseCurrency(formData.precoCompra) || 0,
        dataCompra: formData.dataCompra || null,
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: "Sessão Expirada",
            description: "Por favor, faça login novamente.",
            variant: "destructive",
          });
          // Opcional: Redirecionar para login ou forçar logout
          // window.location.href = "/login";
          return;
        }
        throw new Error(data.error || "Erro ao salvar lote");
      }

      toast({
        title: "Sucesso",
        description: editingLoteId
          ? "Lote atualizado com sucesso"
          : "Lote criado com sucesso",
      });

      handleCloseDialog();
      fetchLotes();
      fetchProducts(); // Atualizar lista de produtos para mostrar novo estoque
    } catch (error) {
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Erro ao salvar lote",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (lote: Lote) => {
    if (lote.status === "esgotado") {
      return (
        <Badge
          variant="secondary"
          className="bg-gray-200 text-gray-600 hover:bg-gray-300 flex items-center gap-1"
        >
          <Package className="h-3 w-3" />
          Finalizado
        </Badge>
      );
    } else if (
      lote.produto.estoqueAtual <= lote.produto.estoqueMinimo &&
      lote.status !== "vencido"
    ) {
      return (
        <Badge
          variant="destructive"
          className="bg-red-100 text-red-800 hover:bg-red-200 flex items-center gap-1"
        >
          <AlertTriangle className="h-3 w-3" />
          Estoque Baixo
        </Badge>
      );
    } else if (lote.status === "sem_validade") {
      return (
        <Badge
          variant="secondary"
          className="bg-gray-100 text-gray-800 hover:bg-gray-200 flex items-center gap-1"
        >
          <CheckCircle className="h-3 w-3" />
          Sem Validade
        </Badge>
      );
    } else if (lote.status === "vencido") {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Vencido
        </Badge>
      );
    } else if (lote.status === "proximo_vencimento") {
      return (
        <Badge
          variant="default"
          className="bg-yellow-500 hover:bg-yellow-600 flex items-center gap-1"
        >
          <AlertTriangle className="h-3 w-3" />
          Vence em {lote.diasParaVencer} dias
        </Badge>
      );
    } else {
      return (
        <Badge
          variant="default"
          className="bg-green-500 hover:bg-green-600 flex items-center gap-1"
        >
          <CheckCircle className="h-3 w-3" />
          Normal
        </Badge>
      );
    }
  };

  // Lógica de Filtragem e Ordenação
  const filteredAndSortedLotes = lotes
    .filter((lote) => {
      const matchesSearch =
        lote.produto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lote.numeroLote.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lote.produto.sku.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesStatus = true;
      if (statusFilter !== "todos") {
        if (statusFilter === "estoque_baixo") {
          matchesStatus =
            lote.produto.estoqueAtual <= lote.produto.estoqueMinimo &&
            lote.status !== "vencido" &&
            lote.status !== "esgotado";
        } else {
          matchesStatus = lote.status === statusFilter;
        }
      }

      // Filtro de ocultar finalizados
      if (hideFinished && lote.status === "esgotado") {
        return false;
      }

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (ordenacao) {
        case "nome-asc":
          return a.produto.nome.localeCompare(b.produto.nome);
        case "nome-desc":
          return b.produto.nome.localeCompare(a.produto.nome);
        case "quantidade-asc":
          return a.quantidade - b.quantidade;
        case "quantidade-desc":
          return b.quantidade - a.quantidade;
        case "validade-proxima":
          if (!a.dataValidade) return 1;
          if (!b.dataValidade) return -1;
          return (
            new Date(a.dataValidade).getTime() -
            new Date(b.dataValidade).getTime()
          );
        case "validade-distante":
          if (!a.dataValidade) return 1;
          if (!b.dataValidade) return -1;
          return (
            new Date(b.dataValidade).getTime() -
            new Date(a.dataValidade).getTime()
          );
        default:
          return 0;
      }
    });

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <AnimatedLoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-gray-900 dark:text-gray-100">
                Lotes Cadastrados
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Gerencie validades e estoque por lote
              </p>
            </div>

            <InteractiveHoverButton
              onClick={() => handleOpenDialog()}
              className="bg-cta-bg text-white border-cta-bg hover:bg-cta-bg/90"
            >
              <span className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Novo Lote
              </span>
            </InteractiveHoverButton>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-end mb-6">
            <div className="flex-1 w-full">
              <Label htmlFor="search">Buscar Lote</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Nome do produto ou número do lote..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="w-full md:w-[250px]">
              <Label>Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(value: any) => setStatusFilter(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="normal">✅ Normal</SelectItem>
                  <SelectItem value="estoque_baixo">
                    ⚠️ Estoque Baixo
                  </SelectItem>
                  <SelectItem value="proximo_vencimento">
                    ⚠️ Próximo Vencimento
                  </SelectItem>
                  <SelectItem value="vencido">❌ Vencido</SelectItem>
                  <SelectItem value="esgotado">📦 Finalizado</SelectItem>
                  <SelectItem value="sem_validade">♾️ Sem Validade</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-[250px]">
              <Label>Ordenar por</Label>
              <Select value={ordenacao} onValueChange={setOrdenacao}>
                <SelectTrigger>
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nome-asc">Nome (A-Z)</SelectItem>
                  <SelectItem value="nome-desc">Nome (Z-A)</SelectItem>
                  <SelectItem value="quantidade-asc">
                    Quantidade (Menor &gt; Maior)
                  </SelectItem>
                  <SelectItem value="quantidade-desc">
                    Quantidade (Maior &gt; Menor)
                  </SelectItem>
                  <SelectItem value="validade-proxima">
                    Validade (Mais Próxima)
                  </SelectItem>
                  <SelectItem value="validade-distante">
                    Validade (Mais Distante)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2 mb-4">
            <Checkbox
              id="hideFinished"
              checked={hideFinished}
              onCheckedChange={(checked) => setHideFinished(checked as boolean)}
            />
            <Label
              htmlFor="hideFinished"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Ocultar lotes finalizados/esgotados
            </Label>
          </div>

          {filteredAndSortedLotes.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400 border rounded-md bg-gray-50 dark:bg-zinc-800 dark:border-zinc-700">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
              <p>Nenhum lote encontrado</p>
              <p className="text-sm">Tente ajustar os filtros de busca</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-gray-50 dark:hover:bg-zinc-800 border-gray-200 dark:border-zinc-700">
                  <TableHead className="text-gray-600 dark:text-gray-400">
                    Produto
                  </TableHead>
                  <TableHead className="text-gray-600 dark:text-gray-400">
                    Número do Lote
                  </TableHead>
                  <TableHead className="text-gray-600 dark:text-gray-400">
                    Quantidade
                  </TableHead>
                  <TableHead className="text-gray-600 dark:text-gray-400">
                    Custo Unit.
                  </TableHead>
                  <TableHead className="text-gray-600 dark:text-gray-400">
                    Data Compra
                  </TableHead>
                  <TableHead className="text-gray-600 dark:text-gray-400">
                    Data de Validade
                  </TableHead>
                  <TableHead className="text-gray-600 dark:text-gray-400">
                    Status
                  </TableHead>
                  <TableHead className="text-right text-gray-600 dark:text-gray-400">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedLotes.map((lote) => (
                  <TableRow
                    key={lote.id}
                    className="hover:bg-gray-50 dark:hover:bg-zinc-800 border-gray-200 dark:border-zinc-700"
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {lote.produto.nome}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          SKU: {lote.produto.sku}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-gray-600 dark:text-gray-300">
                      {lote.numeroLote}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-gray-700 dark:text-gray-300 border-gray-200 dark:border-zinc-700"
                      >
                        {lote.quantidade} un
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-300">
                      R$ {Number(lote.precoCompra).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-300">
                      {lote.dataCompra
                        ? new Date(lote.dataCompra).toLocaleDateString("pt-BR")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-300">
                      {lote.dataValidade
                        ? new Date(lote.dataValidade).toLocaleDateString(
                            "pt-BR"
                          )
                        : "Indeterminado"}
                    </TableCell>
                    <TableCell>{getStatusBadge(lote)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(lote)}
                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog Novo Lote */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingLoteId ? "Editar Lote" : "Novo Lote"}
            </DialogTitle>
            <DialogDescription>
              {editingLoteId
                ? "Edite as informações do lote."
                : "Adicione um novo lote ao estoque."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="produto">Produto</Label>
              <Select
                value={formData.produtoId}
                onValueChange={(value) =>
                  setFormData({ ...formData, produtoId: value })
                }
                disabled={!!editingLoteId}
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numeroLote">Número do Lote</Label>
                <Input
                  id="numeroLote"
                  value={formData.numeroLote}
                  onChange={(e) =>
                    setFormData({ ...formData, numeroLote: e.target.value })
                  }
                  placeholder="Opcional (Gerado auto)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantidade">Quantidade</Label>
                <Input
                  id="quantidade"
                  type="number"
                  value={formData.quantidade}
                  onChange={(e) =>
                    setFormData({ ...formData, quantidade: e.target.value })
                  }
                  placeholder="Qtd"
                  required
                  disabled={!!editingLoteId}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataCompra">Data de Compra</Label>
              <Input
                id="dataCompra"
                type="date"
                value={formData.dataCompra}
                onChange={(e) =>
                  setFormData({ ...formData, dataCompra: e.target.value })
                }
                max={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valorTotalLote">Valor Total do Lote (R$)</Label>
                <Input
                  id="valorTotalLote"
                  type="number"
                  step="0.01"
                  value={formData.valorTotalLote}
                  onChange={(e) =>
                    setFormData({ ...formData, valorTotalLote: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="precoCompra">Custo Unitário (R$)</Label>
                <Input
                  id="precoCompra"
                  type="number"
                  step="0.01"
                  value={formData.precoCompra}
                  readOnly
                  className="bg-gray-100 dark:bg-zinc-800 dark:text-gray-300"
                  placeholder="Calculado auto"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="dataValidade">Data de Validade</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="semValidade"
                    checked={semValidade}
                    onCheckedChange={(checked) => {
                      setSemValidade(checked as boolean);
                      if (checked) {
                        setFormData({ ...formData, dataValidade: "" });
                      }
                    }}
                  />
                  <Label
                    htmlFor="semValidade"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Sem validade
                  </Label>
                </div>
              </div>
              <Input
                id="dataValidade"
                type="date"
                value={formData.dataValidade}
                onChange={(e) =>
                  setFormData({ ...formData, dataValidade: e.target.value })
                }
                disabled={semValidade}
                required={!semValidade}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <InteractiveHoverButton
                type="button"
                className="bg-white hover:bg-gray-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-zinc-700"
                onClick={handleCloseDialog}
              >
                Cancelar
              </InteractiveHoverButton>
              <InteractiveHoverButton
                type="submit"
                className="bg-cta-bg text-white border-cta-bg hover:bg-cta-bg/90"
              >
                {editingLoteId ? "Salvar Alterações" : "Criar Lote"}
              </InteractiveHoverButton>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
