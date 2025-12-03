import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DollarSign, Inbox, Target } from "lucide-react";

interface EmployeeKPIsProps {
  funcionario: {
    totalVendasMes: number | string;
    _count: {
      sales: number;
      caixas: number;
    };
  };
  meta: string;
  setMeta: (value: string) => void;
  handleUpdateMeta: () => void;
  savingMeta: boolean;
  formatCurrency: (value: number | string) => string;
}

export function EmployeeKPIs({
  funcionario,
  meta,
  setMeta,
  handleUpdateMeta,
  savingMeta,
  formatCurrency,
}: EmployeeKPIsProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Permitir apenas números, vírgula e ponto
    const value = e.target.value;
    if (/^[\d,.]*$/.test(value)) {
      setMeta(value);
    }
  };

  const handleBlur = () => {
    if (!meta) {
      setMeta("0,00");
      return;
    }

    // Normalizar entrada: troca ponto por vazio (milhar) e virgula por ponto para parsear
    // Mas aqui queremos apenas formatar bonito para exibição
    // A logica do usuario:
    // 1. Se apagar tudo -> vazio (já tratado no onChange permitindo string vazia)
    // 2. onBlur -> Se vazio, volta para "0,00".
    // 3. onBlur -> Se tem valor, formata bonito (substitui ponto por virgula, etc).

    let numericValue = 0;

    // Tenta interpretar o que o usuário digitou
    // Caso 1: Usuário digitou "1000" -> 1000.00 -> "1.000,00"
    // Caso 2: Usuário digitou "1000,50" -> 1000.50 -> "1.000,50"
    // Caso 3: Usuário digitou "1.000,50" -> 1000.50 -> "1.000,50"

    const cleanValue = meta.replace(/[^\d,.]/g, "");

    // Se tiver vírgula, assume que é decimal
    if (cleanValue.includes(",")) {
      // Remove pontos de milhar se existirem, troca virgula por ponto
      const dotDecimal = cleanValue.replace(/\./g, "").replace(",", ".");
      numericValue = parseFloat(dotDecimal);
    } else {
      // Se não tem vírgula, assume que é inteiro ou decimal com ponto (se o usuario usou ponto como decimal)
      // Mas no BR, ponto costuma ser milhar.
      // O usuario pediu: "Substitua ponto por vírgula automaticamente no onBlur"
      // Se ele digitou "10.50", ele quis dizer "10,50"? Ou "1050"?
      // Contexto: "Aceite ponto e vírgula". "Substitua ponto por vírgula".
      // Então "10.50" -> "10,50".
      const replaced = cleanValue.replace(/\./g, ",");
      // Agora parseia como pt-BR (virgula decimal)
      const dotDecimal = replaced.replace(",", ".");
      numericValue = parseFloat(dotDecimal);
    }

    if (!isNaN(numericValue)) {
      setMeta(
        numericValue.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      );
    } else {
      setMeta("0,00");
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Card de Vendas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Vendas no Mês</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(funcionario.totalVendasMes)}
          </div>
          <p className="text-xs text-muted-foreground">
            {funcionario._count.sales} vendas realizadas
          </p>
        </CardContent>
      </Card>

      {/* Card de Caixas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Caixas Abertos</CardTitle>
          <Inbox className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{funcionario._count.caixas}</div>
          <p className="text-xs text-muted-foreground">Total histórico</p>
        </CardContent>
      </Card>

      {/* Card de Meta */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Meta Mensal</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">R$</span>
            <Input
              type="text"
              value={meta}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="0,00"
              className="h-8 w-32"
            />
            <Button
              size="sm"
              onClick={handleUpdateMeta}
              disabled={savingMeta}
              variant="outline"
            >
              {savingMeta ? "..." : "Salvar"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Progresso:{" "}
            {(() => {
              // Parse robusto para calculo visual
              let val = 0;
              const clean = meta.replace(/\./g, "").replace(",", ".");
              val = parseFloat(clean);

              if (!val || val === 0) return 0;
              return (
                (Number(funcionario.totalVendasMes) / val) *
                100
              ).toFixed(1);
            })()}
            %
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
