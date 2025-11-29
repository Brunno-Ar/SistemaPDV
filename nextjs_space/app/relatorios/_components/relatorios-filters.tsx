import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";

interface RelatoriosFiltersProps {
  dateRange: { startDate: string; endDate: string };
  setDateRange: (range: { startDate: string; endDate: string }) => void;
  onApplyFilter: () => void;
  onClearFilter: () => void;
}

export function RelatoriosFilters({
  dateRange,
  setDateRange,
  onApplyFilter,
  onClearFilter,
}: RelatoriosFiltersProps) {
  return (
    <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-gray-100">
          Filtros de Período
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <Label
              htmlFor="startDate"
              className="text-gray-700 dark:text-gray-300"
            >
              Data Inicial
            </Label>
            <Input
              id="startDate"
              type="date"
              value={dateRange.startDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, startDate: e.target.value })
              }
              className="bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <Label
              htmlFor="endDate"
              className="text-gray-700 dark:text-gray-300"
            >
              Data Final
            </Label>
            <Input
              id="endDate"
              type="date"
              value={dateRange.endDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, endDate: e.target.value })
              }
              className="bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-gray-100"
            />
          </div>
          <InteractiveHoverButton
            onClick={onApplyFilter}
            className="bg-cta-bg text-white border-cta-bg hover:bg-cta-bg/90"
          >
            Aplicar Filtro
          </InteractiveHoverButton>
          <InteractiveHoverButton
            className="bg-white hover:bg-gray-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-zinc-700"
            onClick={onClearFilter}
          >
            Limpar
          </InteractiveHoverButton>
        </div>
      </CardContent>
    </Card>
  );
}
