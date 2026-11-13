/**
 * Limitador de requisicoes simples (janela deslizante) por chave.
 *
 * Uso: proteger rotas que expoem estado de conta (ex.: /api/billing/pending)
 * contra varredura/enumeracao por IP.
 *
 * ponytail: guarda os acessos em memoria, por instancia. Em deploy com mais de
 * uma instancia o limite efetivo e por instancia; trocar por store compartilhado
 * (Redis/Upstash) quando o volume justificar.
 */

export interface LimitadorOpcoes {
  /** Maximo de requisicoes permitidas por chave dentro da janela. */
  limite: number;
  /** Tamanho da janela deslizante em milissegundos. */
  janelaMs: number;
}

export interface Limitador {
  permitir(chave: string, agora?: number): boolean;
  reset(): void;
}

export function criarLimitador({ limite, janelaMs }: LimitadorOpcoes): Limitador {
  const acessos = new Map<string, number[]>();

  return {
    permitir(chave: string, agora: number = Date.now()): boolean {
      const inicio = agora - janelaMs;
      const recentes = (acessos.get(chave) ?? []).filter((t) => t > inicio);

      if (recentes.length >= limite) {
        acessos.set(chave, recentes);
        return false;
      }

      recentes.push(agora);
      acessos.set(chave, recentes);
      return true;
    },
    reset() {
      acessos.clear();
    },
  };
}

/**
 * IP do cliente a partir dos headers de proxy. O primeiro valor de
 * x-forwarded-for e o cliente original; x-real-ip e o fallback.
 */
export function ipDaRequisicao(headers: Headers): string {
  const encaminhado = headers.get("x-forwarded-for");
  if (encaminhado) {
    const primeiro = encaminhado.split(",")[0]?.trim();
    if (primeiro) return primeiro;
  }
  const real = headers.get("x-real-ip")?.trim();
  return real || "desconhecido";
}
