/**
 * Regras de pontuação do Teste Prático de Motoristas — LEMAR.
 * Isolado em arquivo próprio para permitir alterar faixas/pesos sem tocar no restante do app.
 */
const SCORING_RULES = {
  notaMin: 1,
  notaMax: 5,

  grupos: {
    verificacoes: {
      label: 'VERIFICAÇÕES',
      max: 30,
      pontoAtencaoMin: 11,
      pontoAtencaoMax: 18,
      pontoCorte: 10 // score < pontoCorte => CRÍTICO
    },
    habilidades: {
      label: 'HABILIDADES',
      max: 40,
      pontoAtencaoMin: 17,
      pontoAtencaoMax: 24,
      pontoCorte: 16
    },
    comportamento: {
      label: 'COMPORTAMENTO',
      max: 55,
      pontoAtencaoMin: 34,
      pontoAtencaoMax: 43,
      pontoCorte: 33
    }
  },

  totalMax: 125,

  // Ordem importa: primeiro intervalo cujo score se encaixa (min <= score <= max) vence.
  classificacoes: [
    { key: 'apto', min: 90, max: 125, label: 'APTO — PERÍODO DE EXPERIÊNCIA', cor: 'verde' },
    { key: 'treinamento', min: 61, max: 89, label: 'INDICAÇÃO PARA PROGRAMA DE TREINAMENTO', cor: 'amarelo' },
    { key: 'naoApto', min: 0, max: 60, label: 'NÃO APTO', cor: 'vermelho' }
  ],

  // Faixa de score que sugere automaticamente treinamento = SIM (o valor final continua editável).
  sugestaoTreinamento: { min: 61, max: 89 }
};

function classificarGrupo(score, grupoKey) {
  const regra = SCORING_RULES.grupos[grupoKey];
  if (!regra) return null;
  if (score < regra.pontoCorte) return 'CRITICO';
  if (score <= regra.pontoAtencaoMax) return 'ATENCAO';
  return 'ADEQUADO';
}

function classificarTotal(score) {
  for (const c of SCORING_RULES.classificacoes) {
    if (score >= c.min && score <= c.max) return c;
  }
  return SCORING_RULES.classificacoes[SCORING_RULES.classificacoes.length - 1];
}

function sugerirTreinamento(score) {
  return score >= SCORING_RULES.sugestaoTreinamento.min && score <= SCORING_RULES.sugestaoTreinamento.max;
}
