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
import {
  Plus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Package,
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
  dataValidade: string;
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

  // Form state
  const [formData, setFormData] = useState({
    produtoId: "",
    numeroLote: "",
    dataValidade: "",
    quantidade: "",
  });

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

    if (!formData.produtoId || !formData.dataValidade || !formData.quantidade) {
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
          dataValidade: formData.dataValidade,
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
    if (lote.status === "vencido") {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        Carregando lotes...
      </div>
    );
  }

  // Contadores
  const totalLotes = lotes.length;
  const lotesVencidos = lotes.filter((l) => l.status === "vencido").length;
  const lotesProximoVencimento = lotes.filter(
    (l) => l.status === "proximo_vencimento"
  ).length;
  const lotesNormais = lotes.filter((l) => l.status === "normal").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Gestão de Lotes</h2>
        <p className="text-gray-600">Sistema FEFO - First Expired, First Out</p>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total de Lotes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              <p className="text-2xl font-bold">{totalLotes}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Lotes Normais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-2xl font-bold">{lotesNormais}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Próximo Vencimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <p className="text-2xl font-bold">{lotesProximoVencimento}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Lotes Vencidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <p className="text-2xl font-bold">{lotesVencidos}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Botão Adicionar e Tabela */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Lotes Cadastrados</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Visualize e gerencie todos os lotes de produtos
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Lote
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Adicionar Novo Lote</DialogTitle>
                <DialogDescription>
                  Registre a entrada de um novo lote de produtos
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="produtoId">Produto</Label>
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

                <div className="space-y-2">
                  <Label htmlFor="numeroLote">Número do Lote</Label>
                  <Input
                    id="numeroLote"
                    value={formData.numeroLote}
                    onChange={(e) =>
                      setFormData({ ...formData, numeroLote: e.target.value })
                    }
                    placeholder="Ex: LOTE2025-001 (Gerado automaticamente se vazio)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dataValidade">Data de Validade</Label>
                  <Input
                    id="dataValidade"
                    type="date"
                    value={formData.dataValidade}
                    onChange={(e) =>
                      setFormData({ ...formData, dataValidade: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantidade">Quantidade</Label>
                  <Input
                    id="quantidade"
                    type="number"
                    min="1"
                    value={formData.quantidade}
                    onChange={(e) =>
                      setFormData({ ...formData, quantidade: e.target.value })
                    }
                    placeholder="Quantidade de unidades"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseDialog}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">Criar Lote</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0">
          {lotes.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Nenhum lote cadastrado</p>
              <p className="text-sm">
                Clique em "Adicionar Lote" para registrar um novo lote
              </p>
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
                {lotes.map((lote) => (
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
                      {new Date(lote.dataValidade).toLocaleDateString("pt-BR")}
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
