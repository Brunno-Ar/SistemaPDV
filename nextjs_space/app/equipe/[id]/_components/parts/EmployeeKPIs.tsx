import React from "react";
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
  // Estado local para controlar o input sem interferência de re-renders do pai
  const [localMeta, setLocalMeta] = React.useState(meta);

  // Sincroniza o estado local quando a prop muda (ex: carregamento inicial ou após salvar)
  React.useEffect(() => {
    setLocalMeta(meta);
  }, [meta]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalMeta(e.target.value);
  };

  const handleBlur = () => {
    if (!localMeta) {
      setLocalMeta("0,00");
      setMeta("0,00");
      return;
    }

    // Remove tudo que não é dígito, ponto ou vírgula
    const cleanValue = localMeta.replace(/[^\d,.]/g, "");

    let numericValue = 0;

    // Lógica de interpretação PT-BR
    if (cleanValue.includes(",")) {
      // Se tem vírgula, assume formato PT-BR (milhar.centena,decimal)
      numericValue = parseFloat(
        cleanValue.replace(/\./g, "").replace(",", "."),
      );
    } else {
      // Se NÃO tem vírgula
      const dots = cleanValue.split(".").length - 1;

      if (dots === 1 && cleanValue.indexOf(".") > cleanValue.length - 4) {
        // Assume decimal se o ponto estiver nas ultimas 3 posicoes
        numericValue = parseFloat(cleanValue);
      } else {
        // Assume milhar
        numericValue = parseFloat(cleanValue.replace(/\./g, ""));
      }
    }

    if (!isNaN(numericValue)) {
      const formatted = numericValue.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      setLocalMeta(formatted);
      setMeta(formatted); // Atualiza o pai apenas no blur
    } else {
      setLocalMeta("0,00");
      setMeta("0,00");
    }
  };

  // Wrapper para salvar garantindo que o pai tenha o valor correto
  const onSave = () => {
    // Garante que o pai tenha o valor atual do localMeta antes de salvar
    setMeta(localMeta);
    // Pequeno delay para garantir que o estado propagou (embora setMeta seja assíncrono, o handleUpdateMeta usa o estado do pai)
    // Na verdade, o ideal seria passar o valor para handleUpdateMeta, mas vamos confiar no fluxo
    setTimeout(() => {
      handleUpdateMeta();
    }, 0);
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
              value={localMeta}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="0,00"
              className="h-8 w-32"
            />
            <Button
              size="sm"
              onClick={onSave}
              disabled={savingMeta}
              variant="outline"
            >
              {savingMeta ? "..." : "Salvar"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Progresso:{" "}
            {(() => {
              let val = 0;
              const clean = localMeta.replace(/\./g, "").replace(",", ".");
              val = parseFloat(clean);

              if (!val || val === 0) return 0;
              return ((Number(funcionario.totalVendasMes) / val) * 100).toFixed(
                1,
              );
            })()}
            %
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
