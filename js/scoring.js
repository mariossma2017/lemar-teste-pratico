/**
 * Cálculo de pontuação a partir dos dados de uma avaliação.
 * Depende de CRITERIOS (criterios.js) e SCORING_RULES (scoringRules.js).
 */

function scoreGrupo(avaliacao, grupoKey) {
  const itens = CRITERIOS[grupoKey];
  let soma = 0;
  let avaliados = 0;
  for (const item of itens) {
    const nota = avaliacao[grupoKey][item.key];
    if (nota !== null && nota !== undefined) {
      soma += nota;
      avaliados++;
    }
  }
  return { score: soma, avaliados, total: itens.length };
}

function calcularScore(avaliacao) {
  const resultado = { grupos: {}, total: 0, avaliados: 0, totalCriterios: totalCriterios() };

  for (const grupoKey of GRUPOS_ORDEM) {
    const { score, avaliados, total } = scoreGrupo(avaliacao, grupoKey);
    const status = classificarGrupo(score, grupoKey);
    resultado.grupos[grupoKey] = {
      score,
      avaliados,
      total,
      max: SCORING_RULES.grupos[grupoKey].max,
      status,
      completo: avaliados === total
    };
    resultado.total += score;
    resultado.avaliados += avaliados;
  }

  resultado.completo = resultado.avaliados === resultado.totalCriterios;
  resultado.classificacao = resultado.completo || resultado.avaliados > 0
    ? classificarTotal(resultado.total)
    : null;
  resultado.percentualConcluido = Math.round((resultado.avaliados / resultado.totalCriterios) * 100);
  resultado.sugestaoTreinamento = sugerirTreinamento(resultado.total);

  return resultado;
}

function listarPendentes(avaliacao) {
  const pendentes = [];
  for (const grupoKey of GRUPOS_ORDEM) {
    for (const item of CRITERIOS[grupoKey]) {
      const nota = avaliacao[grupoKey][item.key];
      if (nota === null || nota === undefined) {
        pendentes.push({ grupo: grupoKey, key: item.key, label: item.label });
      }
    }
  }
  return pendentes;
}

function listarPontosFracos(avaliacao) {
  const pontos = [];
  for (const grupoKey of GRUPOS_ORDEM) {
    for (const item of CRITERIOS[grupoKey]) {
      const nota = avaliacao[grupoKey][item.key];
      if (nota === 1 || nota === 2) {
        pontos.push({ grupo: grupoKey, key: item.key, label: item.label, nota });
      }
    }
  }
  return pontos;
}

function listarPontosFortes(avaliacao) {
  const pontos = [];
  for (const grupoKey of GRUPOS_ORDEM) {
    for (const item of CRITERIOS[grupoKey]) {
      const nota = avaliacao[grupoKey][item.key];
      if (nota === 5) {
        pontos.push({ grupo: grupoKey, key: item.key, label: item.label, nota });
      }
    }
  }
  return pontos;
}
