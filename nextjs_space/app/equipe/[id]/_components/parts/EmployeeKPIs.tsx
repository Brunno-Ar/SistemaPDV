import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DollarSign, Inbox, Target } from "lucide-react";

interface EmployeeKPIsProps {
  funcionario: any;
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
          <CardTitle className="text-sm font-medium">
            Caixas Abertos
          </CardTitle>
          <Inbox className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {funcionario._count.caixas}
          </div>
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
              type="number"
              step="0.01"
              value={meta}
              onChange={(e) => setMeta(e.target.value)}
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
            {Number(meta) > 0
              ? (
                  (Number(funcionario.totalVendasMes) / Number(meta)) *
                  100
                ).toFixed(1)
              : 0}
            %
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
