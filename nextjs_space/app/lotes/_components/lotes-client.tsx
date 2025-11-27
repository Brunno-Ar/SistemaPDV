"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Product {
  id: string;
  nome: string;
  sku: string;
  estoqueAtual: number;
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
  };
  status?: string;
  diasParaVencer?: number;
}

export default function LotesClient() {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "todos" | "vencido" | "proximo_vencimento" | "normal" | "sem_validade"
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
      const response = await fetch("/api/admin/lotes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          produtoId: formData.produtoId,
          numeroLote: formData.numeroLote,
          dataValidade: semValidade ? null : formData.dataValidade,
          quantidade,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar lote");
      }

      toast({
        title: "Sucesso",
        description: "Lote criado com sucesso",
      });

      handleCloseDialog();
      fetchLotes();
      fetchProducts(); // Atualizar lista de produtos para mostrar novo estoque
    } catch (error) {
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Erro ao criar lote",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (lote: Lote) => {
    if (lote.status === "sem_validade") {
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
        matchesStatus = lote.status === statusFilter;
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
            {/* ... (Dialog for Add Lote) */}
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
