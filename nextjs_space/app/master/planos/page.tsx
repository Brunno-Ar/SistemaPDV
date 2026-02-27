import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function PlanosPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Precificação Dinâmica de Planos
        </h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Painel de Planos</CardTitle>
          <CardDescription>
            Reajuste do valor da assinatura e sincronização em tempo real com a
            API do Asaas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Componente a ser implementado...</p>
        </CardContent>
      </Card>
    </div>
  );
}
