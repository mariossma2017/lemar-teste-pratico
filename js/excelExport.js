/**
 * Exportação para o Excel oficial, a partir do template original.
 * Usa ExcelJS (js/vendor/exceljs.min.js) para preservar fielmente estrutura,
 * mesclagens, bordas, fontes e layout de impressão do formulário.
 */

let _templateBufferCache = null;

async function carregarTemplateBuffer() {
  if (_templateBufferCache) return _templateBufferCache.slice(0);
  const resp = await fetch(EXCEL_TEMPLATE.path);
  if (!resp.ok) throw new Error('Não foi possível carregar o template Excel.');
  const buf = await resp.arrayBuffer();
  _templateBufferCache = buf;
  return buf.slice(0);
}

const DIACRITICOS_REGEX = new RegExp('[̀-ͯ]', 'g');

function sanitizarNomeArquivo(texto) {
  return (texto || '')
    .normalize('NFD').replace(DIACRITICOS_REGEX, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function nomeArquivoExportado(avaliacao) {
  const nome = sanitizarNomeArquivo(avaliacao.candidato.nome) || 'Candidato';
  const dataBR = formatarDataBR(avaliacao.candidato.dataTeste).replace(/\//g, '-') || 'data';
  return `Teste_Pratico_${nome}_${dataBR}.xlsx`;
}

async function gerarWorkbookPreenchido(avaliacao) {
  const buffer = await carregarTemplateBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const ws = workbook.getWorksheet(EXCEL_TEMPLATE.sheetName) || workbook.worksheets[0];

  const c = EXCEL_TEMPLATE.celulas;

  ws.getCell(c.nomeCandidato).value = preencherNomeCandidato(ws.getCell(c.nomeCandidato).value, avaliacao.candidato.nome);
  ws.getCell(c.avaliador).value = preencherAvaliador(ws.getCell(c.avaliador).value, avaliacao.candidato.avaliador);
  ws.getCell(c.funcao).value = preencherFuncao(ws.getCell(c.funcao).value, avaliacao.candidato.funcao);
  ws.getCell(c.dataHorarioCompareceu).value = preencherDataHorarioCompareceu(ws.getCell(c.dataHorarioCompareceu).value, avaliacao.candidato);
  ws.getCell(c.placaAutomatizado).value = preencherPlacaAutomatizado(ws.getCell(c.placaAutomatizado).value, avaliacao.candidato);

  // 25 critérios: marca a coluna da nota selecionada e grava o score do item.
  for (const grupoKey of GRUPOS_ORDEM) {
    for (const { key, linha } of linhasCriteriosGrupo(grupoKey)) {
      const nota = avaliacao[grupoKey][key];
      if (nota === null || nota === undefined) continue;
      const colNota = EXCEL_TEMPLATE.colunaNota[nota];
      ws.getCell(`${colNota}${linha}`).value = EXCEL_TEMPLATE.marcaSelecao;
      ws.getCell(`${EXCEL_TEMPLATE.colunaScoreItem}${linha}`).value = nota;
    }
  }

  const resultado = calcularScore(avaliacao);
  for (const grupoKey of GRUPOS_ORDEM) {
    ws.getCell(EXCEL_TEMPLATE.celulaScoreGrupo[grupoKey]).value = resultado.grupos[grupoKey].score;
  }
  ws.getCell(EXCEL_TEMPLATE.celulaScoreTotal).value = resultado.total;

  ws.getCell(c.treinamentoSim).value = preencherSimNao(ws.getCell(c.treinamentoSim).value, avaliacao.treinamento === true);
  ws.getCell(c.treinamentoNao).value = preencherSimNao(ws.getCell(c.treinamentoNao).value, avaliacao.treinamento === false);
  ws.getCell(c.contratacaoSim).value = preencherSimNao(ws.getCell(c.contratacaoSim).value, avaliacao.recomendaContratacao === true);
  ws.getCell(c.contratacaoNao).value = preencherSimNao(ws.getCell(c.contratacaoNao).value, avaliacao.recomendaContratacao === false);

  // Observação do monitor: vai para o campo "Obs" logo após o SCORE TOTAL.
  try { ws.mergeCells(EXCEL_TEMPLATE.obsMergeRange); } catch (e) { /* já mesclado */ }
  const obsCell = ws.getCell(c.obs);
  obsCell.value = preencherObs(avaliacao.parecer);
  obsCell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
  obsCell.font = { name: 'Calibri', size: 9 };

  // O bloco "Parecer" é reservado para preenchimento manual posterior — permanece em branco.

  const dataAssinatura = avaliacao.finalizadaEm ? formatarDataBR(avaliacao.finalizadaEm.slice(0, 10)) : formatarDataBR(hojeISO());
  ws.getCell(c.assinatura).value = preencherAssinatura(ws.getCell(c.assinatura).value, {
    avaliador: avaliacao.candidato.avaliador,
    data: dataAssinatura
  });

  return workbook;
}

async function exportarAvaliacaoExcel(avaliacao) {
  const workbook = await gerarWorkbookPreenchido(avaliacao);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivoExportado(avaliacao);
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}
