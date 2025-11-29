import FuncionarioDetalhes from "./_components/funcionario-detalhes";

export default function FuncionarioPage({
  params,
}: {
  params: { id: string };
}) {
  return <FuncionarioDetalhes funcionarioId={params.id} />;
}
