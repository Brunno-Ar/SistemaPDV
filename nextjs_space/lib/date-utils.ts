/**
 * Utilitários de Data para lidar com Fuso Horário de Brasília (UTC-3)
 * Centraliza a lógica de conversão para queries e exibição.
 */

/**
 * Retorna a data atual ajustada para o fuso de Brasília (apenas deslocando o tempo).
 * Útil para saber "que dia é hoje" no Brasil.
 */
export function getNowBrasilia(): Date {
  const now = new Date();
  return new Date(now.getTime() - 3 * 60 * 60 * 1000);
}

/**
 * Converte uma data UTC qualquer para a data correspondente em Brasília (deslocando o timestamp).
 * Útil para exibir datas ou agrupar registros baseados no dia local.
 */
export function toBrasiliaDate(date: Date): Date {
  return new Date(date.getTime() - 3 * 60 * 60 * 1000);
}

/**
 * Retorna o início do dia (00:00:00 BRT) em UTC (03:00:00 UTC).
 * Útil para queries no banco de dados (>= startOfDay).
 * @param date Data base (se não fornecida, usa agora)
 */
export function getBrasiliaStartOfDayInUTC(date: Date = new Date()): Date {
  // 1. Pega a hora atual em BRL
  const brTime = new Date(date.getTime() - 3 * 60 * 60 * 1000);

  // 2. Zera as horas (Início do dia BRL)
  brTime.setUTCHours(0, 0, 0, 0);

  // 3. Adiciona 3 horas para voltar a UTC (03:00 UTC)
  // Ou simplesmente constrói a data UTC com hr=3
  // O método seguro cross-month/year:
  // brTime agora é (BRL Year, BRL Month, BRL Day, 00:00:00) mas com valor numérico de timestamp
  // Queremos esse mesmo "Dia" mas as 03:00 UTC.
  // Se simplesmente somarmos 3h no timestamp de `brTime`, teremos 03:00 do dia BRL.

  return new Date(brTime.getTime() + 3 * 60 * 60 * 1000);
}

/**
 * Retorna o início da semana (Domingo) em UTC, baseado na data BRL.
 */
export function getBrasiliaStartOfWeekInUTC(date: Date = new Date()): Date {
  const startOfDay = getBrasiliaStartOfDayInUTC(date); // 03:00 UTC de hoje

  // Precisamos saber que dia da semana é HOJE em BRL.
  // startOfDay é 03:00 UTC. .getUTCDay() de 03:00 UTC vai dar o dia da semana correto (já que mudou o dia as 00:00 UTC, e 03:00 mantém o dia)
  // Ex: 03:00 UTC Domingo (Day 0).
  const dayOfWeek = startOfDay.getUTCDay(); // 0 (Domingo) - 6 (Sábado)

  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - dayOfWeek);
  return startOfWeek;
}

/**
 * Retorna o início do mês (Dia 1) em UTC, baseado na data BRL.
 */
export function getBrasiliaStartOfMonthInUTC(date: Date = new Date()): Date {
  const startOfDay = getBrasiliaStartOfDayInUTC(date);
  const startOfMonth = new Date(startOfDay);
  startOfMonth.setDate(1);
  return startOfMonth;
}
