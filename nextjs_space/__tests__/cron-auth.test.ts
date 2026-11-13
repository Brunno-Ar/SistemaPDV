import { autorizarCron } from "@/lib/cron-auth";

describe("autorizarCron", () => {
  const SECRET = "s3cr3t-do-cron";

  it("autoriza com Bearer correto", () => {
    expect(autorizarCron(`Bearer ${SECRET}`, SECRET)).toBe(true);
  });

  it("nega segredo errado", () => {
    expect(autorizarCron("Bearer outro", SECRET)).toBe(false);
  });

  it("nega header ausente", () => {
    expect(autorizarCron(null, SECRET)).toBe(false);
    expect(autorizarCron(undefined, SECRET)).toBe(false);
    expect(autorizarCron("", SECRET)).toBe(false);
  });

  it("nega quando a env do segredo esta ausente (fail-closed)", () => {
    expect(autorizarCron("Bearer undefined", undefined)).toBe(false);
    expect(autorizarCron("Bearer ", "")).toBe(false);
    expect(autorizarCron("Bearer anything", undefined)).toBe(false);
    expect(autorizarCron("", undefined)).toBe(false);
  });

  it("nega segredo vazio com header vazio (nao abre buraco)", () => {
    expect(autorizarCron("Bearer ", "")).toBe(false);
    expect(autorizarCron("Bearer", "")).toBe(false);
  });

  it("nega espacos extras", () => {
    expect(autorizarCron(`Bearer  ${SECRET}`, SECRET)).toBe(false);
    expect(autorizarCron(`Bearer ${SECRET} `, SECRET)).toBe(false);
    expect(autorizarCron(`${SECRET}`, SECRET)).toBe(false);
  });
});
