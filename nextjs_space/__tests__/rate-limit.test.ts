import { criarLimitador, ipDaRequisicao } from "@/lib/rate-limit";

describe("rate-limit (janela deslizante por chave)", () => {
  it("permite até o limite e bloqueia o excedente", () => {
    const limitador = criarLimitador({ limite: 3, janelaMs: 60_000 });

    expect(limitador.permitir("ip-a", 1000)).toBe(true);
    expect(limitador.permitir("ip-a", 1001)).toBe(true);
    expect(limitador.permitir("ip-a", 1002)).toBe(true);
    expect(limitador.permitir("ip-a", 1003)).toBe(false);
    expect(limitador.permitir("ip-a", 1004)).toBe(false);
  });

  it("libera de novo depois que a janela passa", () => {
    const limitador = criarLimitador({ limite: 1, janelaMs: 1000 });

    expect(limitador.permitir("ip-a", 0)).toBe(true);
    expect(limitador.permitir("ip-a", 500)).toBe(false);
    // 1s depois do primeiro acesso a janela esvazia.
    expect(limitador.permitir("ip-a", 1500)).toBe(true);
  });

  it("chaves diferentes não interferem entre si", () => {
    const limitador = criarLimitador({ limite: 1, janelaMs: 60_000 });

    expect(limitador.permitir("ip-a", 1000)).toBe(true);
    expect(limitador.permitir("ip-b", 1000)).toBe(true);
    expect(limitador.permitir("ip-a", 1000)).toBe(false);
  });

  it("reset limpa o estado", () => {
    const limitador = criarLimitador({ limite: 1, janelaMs: 60_000 });
    expect(limitador.permitir("ip-a", 1000)).toBe(true);
    expect(limitador.permitir("ip-a", 1000)).toBe(false);
    limitador.reset();
    expect(limitador.permitir("ip-a", 1000)).toBe(true);
  });
});

describe("ipDaRequisicao", () => {
  it("usa o primeiro IP de x-forwarded-for", () => {
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(ipDaRequisicao(headers)).toBe("1.2.3.4");
  });

  it("cai para x-real-ip quando não há x-forwarded-for", () => {
    const headers = new Headers({ "x-real-ip": "9.9.9.9" });
    expect(ipDaRequisicao(headers)).toBe("9.9.9.9");
  });

  it("devolve 'desconhecido' sem headers de proxy", () => {
    expect(ipDaRequisicao(new Headers())).toBe("desconhecido");
  });
});
