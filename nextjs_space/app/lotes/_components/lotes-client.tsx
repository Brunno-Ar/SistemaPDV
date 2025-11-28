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
  DialogTrigger,
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
  Filter,
  Edit,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
  createdAt: string;
  produto: {
    nome: string;
    sku: string;
    estoqueAtual: number;
    estoqueMinimo: number;
  };
  status?: string;
  diasParaVencer?: number;
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
  >("todos");
  const [ordenacao, setOrdenacao] = useState("nome-asc");

  // Form state
  const [formData, setFormData] = useState({
    produtoId: "",
    numeroLote: "",
    dataValidade: "",
    quantidade: "",
  });
  const [semValidade, setSemValidade] = useState(false);

  useEffect(() => {
    fetchLotes();
    fetchProducts();
  }, []);

  const fetchLotes = async () => {
    try {
      const response = await fetch("/api/admin/lotes");
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

      if (!response.ok) {
        throw new Error(data.error || "Erro ao carregar produtos");
      }

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

  const handleOpenDialog = () => {
    setFormData({
      produtoId: "",
      numeroLote: "",
      dataValidade: "",
      quantidade: "",
    });
    setSemValidade(false);
    setEditingLoteId(null);
    setDialogOpen(true);
  };

  const handleEdit = (lote: Lote) => {
    setFormData({
      produtoId: lote.produtoId,
      numeroLote: lote.numeroLote,
      dataValidade: lote.dataValidade
        ? new Date(lote.dataValidade).toISOString().split("T")[0]
        : "",
      quantidade: lote.quantidade.toString(),
    });
    setSemValidade(!lote.dataValidade);
    setEditingLoteId(lote.id);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setFormData({
      produtoId: "",
      numeroLote: "",
      dataValidade: "",
      quantidade: "",
    });
    setSemValidade(false);
    setEditingLoteId(null);
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
    if (
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
            lote.status !== "vencido";
        } else {
          matchesStatus = lote.status === statusFilter;
        }
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
      <div className="flex items-center justify-center h-64">
        Carregando lotes...
      </div>
    );
  }

  // ... (rest of the code)

  return (
    <div className="space-y-6">
      {/* ... (header and summary cards) */}

      {/* Filtros e Ações */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle>Lotes Cadastrados</CardTitle>
              <p className="text-sm text-gray-600">
                Gerencie validades e estoque por lote
              </p>
            </div>
            <InteractiveHoverButton
              onClick={handleOpenDialog}
              className="bg-[#137fec] text-white border-[#137fec]"
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

          {filteredAndSortedLotes.length === 0 ? (
            <div className="p-8 text-center text-gray-500 border rounded-md bg-gray-50">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Nenhum lote encontrado</p>
              <p className="text-sm">Tente ajustar os filtros de busca</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Número do Lote</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Data de Validade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedLotes.map((lote) => (
                  <TableRow key={lote.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{lote.produto.nome}</p>
                        <p className="text-sm text-gray-500">
                          SKU: {lote.produto.sku}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {lote.numeroLote}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{lote.quantidade} un</Badge>
                    </TableCell>
                    <TableCell>
                      {lote.dataValidade
                        ? new Date(lote.dataValidade).toLocaleDateString(
                            "pt-BR"
                          )
                        : "Indeterminado"}
                    </TableCell>
                    <TableCell>{getStatusBadge(lote)}</TableCell>
                    <TableCell className="text-right">
                      <InteractiveHoverButton
                        className="w-10 min-w-10 px-0 bg-transparent hover:bg-gray-100 text-gray-700 border-transparent hover:border-gray-200"
                        onClick={() => handleEdit(lote)}
                      >
                        <Edit className="h-4 w-4" />
                      </InteractiveHoverButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingLoteId ? "Editar Lote" : "Novo Lote"}
            </DialogTitle>
            <DialogDescription>
              {editingLoteId
                ? "Atualize as informações do lote."
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
                className="bg-white hover:bg-gray-50 text-gray-700 border-gray-200"
                onClick={handleCloseDialog}
              >
                Cancelar
              </InteractiveHoverButton>
              <InteractiveHoverButton
                type="submit"
                className="bg-[#137fec] text-white border-[#137fec]"
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
