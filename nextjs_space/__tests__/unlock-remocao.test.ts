/**
 * @jest-environment node
 *
 * Teste de regressão: rota /api/admin/assinatura/unlock foi removida porque
 * liberava 24h sem PAYMENT_RECEIVED (decisão do Bruno).
 * Nenhuma conexão de banco, Asaas ou rede.
 */
import { existsSync } from "fs";
import { join } from "path";

it("rota de desbloqueio temporário sem pagamento foi removida", () => {
  const caminho = join(
    __dirname,
    "..",
    "app",
    "api",
    "admin",
    "assinatura",
    "unlock",
    "route.ts",
  );
  expect(existsSync(caminho)).toBe(false);
});
