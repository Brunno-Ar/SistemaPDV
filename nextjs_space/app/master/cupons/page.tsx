"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Edit,
  Ticket,
  Percent,
  Calendar,
  Users,
  RefreshCw,
  Store,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EmpresaUso {
  id: string;
  nome: string;
  data: string;
  status: string;
}

interface Cupom {
  codigo: string;
  descontoPorcentagem: number;
  validoAte: string | null;
  usosAtuais: number;
  limiteUsos: number | null;
  expirado: boolean;
  esgotado: boolean;
  ativo: boolean;
  empresas: EmpresaUso[];
}

export default function CuponsPage() {
  const [cupons, setCupons] = useState<Cupom[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [empresasDialogOpen, setEmpresasDialogOpen] = useState(false);
  const [selectedCupom, setSelectedCupom] = useState<Cupom | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    codigo: "",
    descontoPorcentagem: "",
    validoAte: "",
    limiteUsos: "",
  });

  const fetchCupons = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/master/cupons");
      if (res.ok) {
        const data = await res.json();
        setCupons(data);
      }
    } catch (error) {
      console.error("Erro ao buscar cupons:", error);
      toast.error("Erro ao carregar cupons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCupons();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const method = editMode ? "PUT" : "POST";
      const res = await fetch("/api/master/cupons", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message);
        setDialogOpen(false);
        resetForm();
        fetchCupons();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error("Erro ao salvar cupom:", error);
      toast.error("Erro ao salvar cupom");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (codigo: string) => {
    if (!confirm(`Tem certeza que deseja excluir o cupom ${codigo}?`)) return;

    try {
      const res = await fetch("/api/master/cupons", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message);
        fetchCupons();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error("Erro ao excluir cupom:", error);
      toast.error("Erro ao excluir cupom");
    }
  };

  const handleEdit = (cupom: Cupom) => {
    setFormData({
      codigo: cupom.codigo,
      descontoPorcentagem: cupom.descontoPorcentagem.toString(),
      validoAte: cupom.validoAte
        ? new Date(cupom.validoAte).toISOString().split("T")[0]
        : "",
      limiteUsos: cupom.limiteUsos?.toString() || "",
    });
    setEditMode(true);
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      codigo: "",
      descontoPorcentagem: "",
      validoAte: "",
      limiteUsos: "",
    });
    setEditMode(false);
  };

  const openNewDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEmpresasDialog = (cupom: Cupom) => {
    setSelectedCupom(cupom);
    setEmpresasDialogOpen(true);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Diálogo de Empresas que usaram o cupom */}
      <Dialog open={empresasDialogOpen} onOpenChange={setEmpresasDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-blue-500" />
              Empresas - Cupom {selectedCupom?.codigo}
            </DialogTitle>
            <DialogDescription>
              Lista de empresas que aplicaram este cupom de{" "}
              {selectedCupom?.descontoPorcentagem}% OFF
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {selectedCupom?.empresas && selectedCupom.empresas.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Data de Cadastro</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedCupom.empresas.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.nome}</TableCell>
                      <TableCell>
                        {format(new Date(emp.data), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            emp.status === "ATIVO" ? "default" : "secondary"
                          }
                          className={
                            emp.status === "ATIVO"
                              ? "bg-green-500 hover:bg-green-600"
                              : ""
                          }
                        >
                          {emp.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            window.open(
                              `/master/empresas?id=${emp.id}`,
                              "_blank",
                            )
                          }
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Ver Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                Nenhuma empresa usou este cupom ainda.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setEmpresasDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Ticket className="h-6 w-6" />
            Gerenciamento de Cupons
          </h1>
          <p className="text-muted-foreground">
            Crie e gerencie cupons de desconto para assinaturas
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCupons}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Atualizar
          </Button>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNewDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Cupom
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editMode ? "Editar Cupom" : "Criar Novo Cupom"}
                </DialogTitle>
                <DialogDescription>
                  {editMode
                    ? "Atualize as informações do cupom"
                    : "Preencha os dados para criar um novo cupom de desconto"}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código do Cupom</Label>
                  <Input
                    id="codigo"
                    placeholder="Ex: BLACKFRIDAY50"
                    value={formData.codigo}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        codigo: e.target.value.toUpperCase(),
                      })
                    }
                    disabled={editMode}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="desconto">Desconto (%)</Label>
                  <div className="relative">
                    <Input
                      id="desconto"
                      type="number"
                      min="1"
                      max="100"
                      placeholder="50"
                      value={formData.descontoPorcentagem}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          descontoPorcentagem: e.target.value,
                        })
                      }
                      required
                    />
                    <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="validoAte">Válido até (opcional)</Label>
                  <div className="relative">
                    <Input
                      id="validoAte"
                      type="date"
                      value={formData.validoAte}
                      onChange={(e) =>
                        setFormData({ ...formData, validoAte: e.target.value })
                      }
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Deixe vazio para cupom sem data de expiração
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="limiteUsos">Limite de usos (opcional)</Label>
                  <div className="relative">
                    <Input
                      id="limiteUsos"
                      type="number"
                      min="1"
                      placeholder="100"
                      value={formData.limiteUsos}
                      onChange={(e) =>
                        setFormData({ ...formData, limiteUsos: e.target.value })
                      }
                    />
                    <Users className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Deixe vazio para usos ilimitados
                  </p>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Salvando..." : editMode ? "Atualizar" : "Criar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Cupons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cupons.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cupons Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {cupons.filter((c) => c.ativo).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Usos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cupons.reduce((acc, c) => acc + c.usosAtuais, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Cupons</CardTitle>
          <CardDescription>
            Todos os cupons cadastrados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-10 text-muted-foreground">
              Carregando cupons...
            </div>
          ) : cupons.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              Nenhum cupom cadastrado. Clique em &quot;Novo Cupom&quot; para
              criar.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Desconto</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Usos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cupons.map((cupom) => (
                  <TableRow key={cupom.codigo}>
                    <TableCell className="font-mono font-bold">
                      {cupom.codigo}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {cupom.descontoPorcentagem}% OFF
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {cupom.validoAte
                        ? format(new Date(cupom.validoAte), "dd/MM/yyyy", {
                            locale: ptBR,
                          })
                        : "Sem limite"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-medium hover:bg-transparent hover:underline flex items-center gap-1"
                        onClick={() => openEmpresasDialog(cupom)}
                        title="Ver empresas que usaram este cupom"
                      >
                        {cupom.usosAtuais}
                        {cupom.limiteUsos ? ` / ${cupom.limiteUsos}` : ""}
                        <ExternalLink className="h-3 w-3 ml-1 text-muted-foreground" />
                      </Button>
                    </TableCell>
                    <TableCell>
                      {cupom.ativo ? (
                        <Badge className="bg-green-500 hover:bg-green-600">
                          Ativo
                        </Badge>
                      ) : cupom.expirado ? (
                        <Badge variant="destructive">Expirado</Badge>
                      ) : (
                        <Badge variant="outline">Esgotado</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(cupom)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleDelete(cupom.codigo)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
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
