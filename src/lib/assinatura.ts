/**
 * Utilitários para gestão de vencimento e ciclos de assinatura.
 * O dia padrão de vencimento é o dia 15 de cada mês.
 */

function getBrasiliaDateParts(date: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const map: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== "literal") {
      map[p.type] = parseInt(p.value, 10);
    }
  }
  return {
    year: map.year,
    month: map.month, // 1 a 12
    day: map.day,
    hour: map.hour,
    minute: map.minute,
    second: map.second,
  };
}

function formatarIsoBrasilia(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  // Define o vencimento no final do dia no fuso de Brasília (-03:00)
  return `${year}-${m}-${d}T23:59:59-03:00`;
}

/**
 * Calcula a próxima data de vencimento fixada no dia do mês (padrão dia 15).
 * 
 * Regras:
 * - Se a cliente pagar antes do vencimento ou no dia, o vencimento é estendido para o dia 15 do mês seguinte.
 * - Se a cliente pagar atrasada (ex: pagou dia 20 de outubro), o pagamento cobre o ciclo atual e o próximo vencimento é dia 15 do mês seguinte (15 de novembro).
 * - Se a cliente pagar adiantado mais de uma vez, avança 1 mês a partir do vencimento já programado.
 */
export function calcularProximoVencimento(
  venceEmAtual?: Date | string | null,
  diaVencimento: number = 15,
  agora: Date = new Date()
): string {
  const diaAlvo = Math.min(Math.max(diaVencimento, 1), 28);
  const nowBr = getBrasiliaDateParts(agora);

  // Se a assinatura ainda está válida no futuro (> agora)
  if (venceEmAtual) {
    const vAtual = new Date(venceEmAtual);
    if (vAtual.getTime() > agora.getTime()) {
      const vBr = getBrasiliaDateParts(vAtual);
      let nextYear = vBr.year;
      let nextMonth = vBr.month + 1;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear++;
      }
      return formatarIsoBrasilia(nextYear, nextMonth, diaAlvo);
    }
  }

  // Se está vencida ou sem data futura (ex: pagou atrasada):
  // O pagamento atual cobre o ciclo e o próximo vencimento será o dia 15 do mês seguinte.
  let nextYear = nowBr.year;
  let nextMonth = nowBr.month + 1;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear++;
  }
  return formatarIsoBrasilia(nextYear, nextMonth, diaAlvo);
}
