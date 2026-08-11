/**
 * Mapeamento ÚNICO entre os dados do app e as células do template Excel oficial
 * (templates/teste-pratico-motoristas.xlsx). Qualquer alteração no layout do
 * formulário Excel deve ser refletida SOMENTE aqui.
 *
 * O texto fixo das células (rótulos, legendas) nunca é hardcoded neste arquivo —
 * o excelExport.js sempre lê o texto original de dentro do próprio template e
 * usa as funções `preencher*` abaixo para inserir os valores nos espaços em
 * branco, preservando 100% do texto original do formulário.
 */

const EXCEL_TEMPLATE = {
  path: 'templates/teste-pratico-motoristas.xlsx',
  sheetName: 'ATUALIZADO MARÇO-2025',

  celulas: {
    nomeCandidato: 'A1',
    dataHorarioCompareceu: 'A2',
    avaliador: 'A3',
    funcao: 'A4',
    placaAutomatizado: 'A5',
    treinamentoSim: 'F43',
    treinamentoNao: 'G43',
    contratacaoSim: 'F44',
    contratacaoNao: 'G44',
    obs: 'A39',
    parecer: 'A50',
    assinatura: 'A51'
  },

  // "Obs" recebe a observação do monitor, imediatamente após o SCORE TOTAL.
  // O bloco "Parecer" (parecerMergeRange) é reservado para preenchimento manual
  // posterior e NUNCA deve receber texto do app — fica sempre em branco.
  obsMergeRange: 'A39:H39',
  parecerMergeRange: 'A50:H50',

  // Linha inicial de cada grupo na grade de critérios (colunas C..G = notas 1..5, H = score).
  linhaInicialGrupo: {
    verificacoes: 8,
    habilidades: 14,
    comportamento: 22
  },

  colunaNota: { 1: 'C', 2: 'D', 3: 'E', 4: 'F', 5: 'G' },
  colunaScoreItem: 'H',

  celulaScoreGrupo: {
    verificacoes: 'C35',
    habilidades: 'C36',
    comportamento: 'C37'
  },
  celulaScoreTotal: 'C38',

  marcaSelecao: 'X'
};

/**
 * Retorna, para cada critério de um grupo, a linha correspondente na planilha
 * (na mesma ordem de CRITERIOS[grupoKey], definido em criterios.js).
 */
function linhasCriteriosGrupo(grupoKey) {
  const linhaInicial = EXCEL_TEMPLATE.linhaInicialGrupo[grupoKey];
  return CRITERIOS[grupoKey].map((item, idx) => ({ key: item.key, linha: linhaInicial + idx }));
}

// ---- Funções de preenchimento de texto (preservam o texto fixo original) ----

function preencherNomeCandidato(original, nome) {
  return `${original.replace(/\s*$/, '')} ${nome || ''}`.trimEnd();
}

function preencherAvaliador(original, avaliador) {
  return `${original.replace(/\s*$/, '')} ${avaliador || ''}`.trimEnd();
}

function preencherFuncao(original, funcao) {
  return `${original.replace(/\s*$/, '')} ${funcao || ''}`.trimEnd();
}

function preencherDataHorarioCompareceu(original, { dataTeste, horario, compareceu }) {
  let texto = original;
  const dataBR = dataTeste ? formatarDataBR(dataTeste) : '';
  if (dataBR) {
    const [dd, mm, yyyy] = dataBR.split('/');
    texto = texto.replace(/_{3,}\s*\/\s*_{3,}\s*\/\s*_{3,}/, `${dd}/${mm}/${yyyy}`);
  }

  if (horario) {
    const [hh, mi] = horario.split(':');
    texto = texto.replace(/_{3,}\s*:\s*_{3,}(?=\s*hs)/, `${hh}:${mi}`);
  }

  texto = texto.replace(/SIM\s*\(\s*\)/, compareceu === true ? 'SIM ( X )' : 'SIM (   )');
  texto = texto.replace(/Não\s*\(\s*\)/, compareceu === false ? 'Não ( X )' : 'Não (   )');

  return texto;
}

function preencherPlacaAutomatizado(original, { placa, automatizado }) {
  let texto = original;
  if (placa && placa.trim()) {
    texto = texto.replace(/_{5,}/, `${placa.trim()} `);
  }
  texto = texto.replace(/Sim\s*\(\s*\)/, automatizado === true ? 'Sim ( X )' : 'Sim (   )');
  texto = texto.replace(/Não\s*\(\s*\)/, automatizado === false ? 'Não ( X )' : 'Não (   )');
  return texto;
}

function preencherSimNao(original, marcado) {
  if (!marcado) return original;
  return original.replace(/\(\s*\)/, '( X )');
}

function preencherObs(texto) {
  return `Obs: ${texto || ''}`.trimEnd();
}

function preencherAssinatura(original, { avaliador, data }) {
  let texto = original;
  texto = texto.replace('Nome:', `Nome: ${avaliador || ''}`);
  texto = texto.replace(/Data:\s*$/, `Data: ${data || ''}`);
  return texto;
}
