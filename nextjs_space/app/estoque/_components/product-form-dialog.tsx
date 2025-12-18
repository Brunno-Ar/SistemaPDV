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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { Plus, Package } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { parseCurrency } from "@/lib/utils";
import Image from "next/image";

interface Category {
  id: string;
  nome: string;
}

interface Product {
  id: string;
  nome: string;
  sku: string;
  precoVenda: number;
  precoCompra: number;
  estoqueAtual: number;
  estoqueMinimo: number;
  imagemUrl?: string | null;
  categoryId?: string | null;
}

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productToEdit: Product | null;
  onSuccess: () => void;
  categories: Category[];
  companyId?: string;
  onOpenCategoryDialog: () => void;
}

export function ProductFormDialog({
  open,
  onOpenChange,
  productToEdit,
  onSuccess,
  categories,
  companyId,
  onOpenCategoryDialog,
}: ProductFormDialogProps) {
  const [formData, setFormData] = useState({
    nome: "",
    sku: "",
    precoVenda: "",
    precoCompra: "",
    estoqueAtual: "",
    estoqueMinimo: "",
    imagemUrl: "",
    loteInicial: "",
    validadeInicial: "",
    categoryId: "",
    valorTotalLoteInicial: "",
    dataCompraInicial: "",
  });
  const [semValidadeInicial, setSemValidadeInicial] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>("");

  useEffect(() => {
    if (open) {
      if (productToEdit) {
        setFormData({
          nome: productToEdit.nome,
          sku: productToEdit.sku,
          precoVenda: productToEdit.precoVenda.toString(),
          precoCompra: productToEdit.precoCompra.toString(),
          estoqueAtual: productToEdit.estoqueAtual.toString(),
          estoqueMinimo: productToEdit.estoqueMinimo.toString(),
          imagemUrl: productToEdit.imagemUrl || "",
          loteInicial: "",
          validadeInicial: "",
          categoryId: productToEdit.categoryId || "",
          valorTotalLoteInicial: "",
          dataCompraInicial: "",
        });
        setImagePreview("");
        setSelectedFile(null);
        setSemValidadeInicial(false);
      } else {
        setFormData({
          nome: "",
          sku: "",
          precoVenda: "",
          precoCompra: "",
          estoqueAtual: "0",
          estoqueMinimo: "5",
          imagemUrl: "",
          loteInicial: "0",
          validadeInicial: "",
          categoryId: "",
          valorTotalLoteInicial: "",
          dataCompraInicial: "",
        });
        setImagePreview("");
        setSelectedFile(null);
        setSemValidadeInicial(false);
      }
    }
  }, [open, productToEdit]);

  // Handlers para input de estoque inicial
  const handleLoteInicialChange = (value: string) => {
    const qtd = parseFloat(value);
    const unitPrice = parseFloat(formData.precoCompra);

    let updates: Partial<typeof formData> = { loteInicial: value };

    if (!isNaN(qtd) && !isNaN(unitPrice)) {
      updates.valorTotalLoteInicial = (qtd * unitPrice).toFixed(2);
    }

    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleValorTotalInicialChange = (value: string) => {
    const total = parseFloat(value);
    const qtd = parseFloat(formData.loteInicial);

    let updates: Partial<typeof formData> = { valorTotalLoteInicial: value };

    if (!isNaN(total) && !isNaN(qtd) && qtd > 0) {
      updates.precoCompra = (total / qtd).toFixed(2);
    }

    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handlePrecoUnitarioChange = (value: string) => {
    const unitPrice = parseFloat(value);
    const qtd = parseFloat(formData.loteInicial);

    let updates: Partial<typeof formData> = { precoCompra: value };

    if (formData.loteInicial && !isNaN(unitPrice) && !isNaN(qtd)) {
      updates.valorTotalLoteInicial = (qtd * unitPrice).toFixed(2);
    }

    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!selectedFile) return null;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      return data.cloud_storage_path;
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao fazer upload da imagem",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.precoVenda) {
      toast({
        title: "Erro",
        description: "Preencha os campos obrigatórios (Nome e Valor de venda)",
        variant: "destructive",
      });
      return;
    }

    const precoVenda = parseCurrency(formData.precoVenda);
    const precoCompra = parseCurrency(formData.precoCompra) || 0;
    const estoqueAtual = formData.estoqueAtual
      ? parseInt(formData.estoqueAtual)
      : 0;
    const estoqueMinimo = parseInt(formData.estoqueMinimo) || 5;

    if (precoVenda <= 0) {
      toast({
        title: "Erro",
        description: "Preço de venda inválido",
        variant: "destructive",
      });
      return;
    }

    if (formData.loteInicial && parseFloat(formData.loteInicial) > 0) {
      if (!precoCompra || precoCompra <= 0) {
        toast({
          title: "Erro",
          description:
            "Para adicionar estoque inicial, o custo unitário é obrigatório e deve ser maior que zero.",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      let imagemUrl = formData.imagemUrl;
      if (selectedFile) {
        const uploadedUrl = await uploadImage();
        if (uploadedUrl) imagemUrl = uploadedUrl;
      }

      let url = productToEdit
        ? `/api/admin/products/${productToEdit.id}`
        : "/api/admin/products";
      if (companyId) url += `?companyId=${companyId}`;

      const method = productToEdit ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: formData.nome,
          sku: formData.sku,
          precoVenda,
          precoCompra,
          estoqueAtual,
          estoqueMinimo,
          imagemUrl: imagemUrl || null,
          loteInicial: formData.loteInicial
            ? parseInt(formData.loteInicial)
            : undefined,
          validadeInicial: semValidadeInicial
            ? null
            : formData.validadeInicial || undefined,
          dataCompraInicial: formData.dataCompraInicial || null,
          categoryId: formData.categoryId || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao salvar produto");

      toast({
        title: "Sucesso",
        description: productToEdit ? "Produto atualizado" : "Produto criado",
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-gray-100">
            {productToEdit ? "Editar Produto" : "Novo Produto"}
          </DialogTitle>
          <DialogDescription className="text-gray-500 dark:text-gray-400">
            {productToEdit
              ? "Atualize os dados do produto."
              : "Preencha as informações do novo produto."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label
                htmlFor="nome"
                className="text-gray-700 dark:text-gray-300"
              >
                Nome
              </Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) =>
                  setFormData({ ...formData, nome: e.target.value })
                }
                required
                className="bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku" className="text-gray-700 dark:text-gray-300">
                SKU
              </Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) =>
                  setFormData({ ...formData, sku: e.target.value })
                }
                placeholder="Gerado automaticamente se vazio"
                className="bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>
          </div>

          {/* Categoria */}
          <div className="space-y-2">
            <Label
              htmlFor="category"
              className="text-gray-700 dark:text-gray-300"
            >
              Categoria
            </Label>
            <div className="flex gap-2">
              <Select
                value={formData.categoryId}
                onValueChange={(value) =>
                  setFormData({ ...formData, categoryId: value })
                }
              >
                <SelectTrigger className="flex-1 bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
                  <SelectItem
                    value="sem_categoria"
                    className="text-gray-900 dark:text-gray-100 focus:bg-gray-100 dark:focus:bg-zinc-800"
                  >
                    Sem Categoria
                  </SelectItem>
                  {categories.map((cat) => (
                    <SelectItem
                      key={cat.id}
                      value={cat.id}
                      className="text-gray-900 dark:text-gray-100 focus:bg-gray-100 dark:focus:bg-zinc-800"
                    >
                      {cat.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <InteractiveHoverButton
                type="button"
                className="w-10 min-w-10 px-0 border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800"
                onClick={onOpenCategoryDialog}
                title="Nova Categoria"
              >
                <Plus className="h-4 w-4" />
              </InteractiveHoverButton>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {productToEdit && (
              <div className="space-y-2">
                <Label className="text-gray-500 dark:text-gray-400">
                  Custo (Auto)
                </Label>
                <div className="flex h-10 w-full items-center rounded-md border border-input bg-gray-100 dark:bg-zinc-800 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 border-gray-200 dark:border-zinc-700">
                  R$ {formData.precoCompra}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label
                htmlFor="precoVenda"
                className="text-gray-700 dark:text-gray-300"
              >
                Valor de venda
              </Label>
              <Input
                id="precoVenda"
                type="number"
                step="0.01"
                value={formData.precoVenda}
                onChange={(e) =>
                  setFormData({ ...formData, precoVenda: e.target.value })
                }
                required
                className="bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          {productToEdit ? (
            <div className="space-y-2">
              <Label
                htmlFor="estoqueAtual"
                className="text-gray-700 dark:text-gray-300"
              >
                Estoque Atual
              </Label>
              <Input
                id="estoqueAtual"
                type="number"
                value={formData.estoqueAtual}
                onChange={(e) =>
                  setFormData({ ...formData, estoqueAtual: e.target.value })
                }
                required
                disabled
                className="bg-gray-100 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              />
            </div>
          ) : (
            /* 🆕 SEÇÃO: ESTOQUE INICIAL (PRIMEIRO LOTE) */
            <div className="space-y-4 p-4 border-2 border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                  Estoque Inicial (Primeiro Lote)
                </h3>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                📦 <strong>Cadastro Unificado:</strong> Crie o produto e seu
                primeiro lote em uma única etapa!
              </p>

              <div className="space-y-2">
                <Label
                  htmlFor="loteInicial"
                  className="text-gray-700 dark:text-gray-300"
                >
                  Quantidade do Lote
                </Label>
                <Input
                  id="loteInicial"
                  type="number"
                  min="0"
                  value={formData.loteInicial}
                  onChange={(e) => handleLoteInicialChange(e.target.value)}
                  placeholder="0"
                  className="bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  💡 Se informar quantidade &gt; 0, o estoque inicial será
                  definido automaticamente
                </p>
              </div>

              {/* 🆕 Campos de Custo do Lote */}
              <div className="space-y-2">
                <Label
                  htmlFor="dataCompraInicial"
                  className="text-gray-700 dark:text-gray-300"
                >
                  Data de Compra
                </Label>
                <Input
                  id="dataCompraInicial"
                  type="date"
                  value={formData.dataCompraInicial}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      dataCompraInicial: e.target.value,
                    })
                  }
                  className="bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="valorTotalLoteInicial"
                    className="text-gray-700 dark:text-gray-300"
                  >
                    Valor de compra
                  </Label>
                  <Input
                    id="valorTotalLoteInicial"
                    type="number"
                    step="0.01"
                    value={formData.valorTotalLoteInicial}
                    onChange={(e) =>
                      handleValorTotalInicialChange(e.target.value)
                    }
                    placeholder="0.00"
                    className="bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="precoCompraInicial"
                    className="text-gray-600 dark:text-gray-400"
                  >
                    Custo Unit. (R$)
                  </Label>
                  <Input
                    id="precoCompraInicial"
                    type="number"
                    step="0.01"
                    value={formData.precoCompra}
                    onChange={(e) => handlePrecoUnitarioChange(e.target.value)}
                    className="bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="validadeInicial"
                    className="text-gray-700 dark:text-gray-300"
                  >
                    Data de Validade
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="semValidadeInicial"
                      checked={semValidadeInicial}
                      onCheckedChange={(checked) => {
                        setSemValidadeInicial(checked as boolean);
                        if (checked) {
                          setFormData({ ...formData, validadeInicial: "" });
                        }
                      }}
                      className="border-gray-300 dark:border-zinc-600 data-[state=checked]:bg-blue-600 dark:data-[state=checked]:bg-blue-500"
                    />
                    <Label
                      htmlFor="semValidadeInicial"
                      className="text-sm font-normal cursor-pointer text-gray-700 dark:text-gray-300"
                    >
                      Produto sem validade
                    </Label>
                  </div>
                </div>
                <Input
                  id="validadeInicial"
                  type="date"
                  value={formData.validadeInicial}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      validadeInicial: e.target.value,
                    })
                  }
                  min={new Date().toISOString().split("T")[0]}
                  disabled={semValidadeInicial}
                  required={!semValidadeInicial && !!formData.loteInicial}
                  className="bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100 disabled:opacity-50"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  📅 Obrigatória se houver quantidade no lote (exceto se
                  &quot;Sem validade&quot;)
                </p>
              </div>

              <div className="bg-white dark:bg-zinc-900 p-3 rounded border border-blue-300 dark:border-blue-700">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Como funciona:</strong> Ao criar o produto com lote
                  inicial, você economiza tempo ao não precisar cadastrar o lote
                  em outra tela. O número do lote será gerado automaticamente.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label
              htmlFor="estoqueMinimo"
              className="text-gray-700 dark:text-gray-300"
            >
              Estoque Mínimo (Alerta)
            </Label>
            <Input
              id="estoqueMinimo"
              type="number"
              value={formData.estoqueMinimo}
              onChange={(e) =>
                setFormData({ ...formData, estoqueMinimo: e.target.value })
              }
              className="bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 dark:text-gray-300">
              Imagem (Opcional)
            </Label>
            <Input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100 file:text-gray-700 dark:file:text-gray-300"
            />
            {(imagePreview || (productToEdit?.imagemUrl && !selectedFile)) && (
              <Image
                src={imagePreview || productToEdit?.imagemUrl || ""}
                alt="Preview"
                width={80}
                height={80}
                className="object-cover rounded border border-gray-200 dark:border-zinc-700 mt-2"
                unoptimized // Using unoptimized to handle external URLs or local previews without full config
              />
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <InteractiveHoverButton
              type="button"
              className="bg-white hover:bg-gray-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-zinc-700"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </InteractiveHoverButton>
            <InteractiveHoverButton
              type="submit"
              disabled={uploadingImage}
              className="bg-primary text-primary-foreground border-primary hover:bg-primary/90"
            >
              {uploadingImage ? "Salvando..." : "Salvar"}
            </InteractiveHoverButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
