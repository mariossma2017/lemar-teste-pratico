/**
 * Exportação para o Excel oficial — manipulação direta do pacote XLSX (ZIP + XML).
 *
 * NÃO reconstrói a planilha com uma biblioteca de alto nível (nada de
 * `new Workbook()`). O arquivo nasce do template original: carregamos o .xlsx
 * como ZIP (JSZip), localizamos apenas as células que precisam de dado e
 * substituímos SOMENTE o conteúdo de cada uma — preservando seu atributo de
 * estilo (`s="N"`) — e absolutamente todo o resto do pacote (styles.xml,
 * sharedStrings.xml, printerSettings, theme, workbook.xml, mesclagens etc.)
 * permanece byte a byte idêntico ao template, porque nunca é tocado.
 *
 * Todo valor de texto é escrito como célula "inline string" (t="inlineStr"),
 * nunca reaproveitando/alterando uma entrada de sharedStrings.xml — várias
 * células do template (ex.: "SIM(   )" em F43 e F44) apontam para a MESMA
 * entrada compartilhada, então editá-la in-place vazaria a marcação de uma
 * célula para outra.
 */

const SHEET_XML_PATH = 'xl/worksheets/sheet1.xml';
const SHARED_STRINGS_PATH = 'xl/sharedStrings.xml';

let _templateBufferCache = null;

async function carregarTemplateBuffer() {
  if (_templateBufferCache) return _templateBufferCache.slice(0);
  const resp = await fetch(EXCEL_TEMPLATE.path);
  if (!resp.ok) throw new Error('Não foi possível carregar o template Excel.');
  const buf = await resp.arrayBuffer();
  _templateBufferCache = buf;
  return buf.slice(0);
}

function escaparXmlTexto(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function desescaparXmlTexto(texto) {
  return String(texto)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function parseSharedStrings(xml) {
  const itens = [];
  const siRegex = /<si>([\s\S]*?)<\/si>/g;
  let m;
  while ((m = siRegex.exec(xml)) !== null) {
    let texto = '';
    const tRegex = /<t[^>]*>([\s\S]*?)<\/t>/g;
    let tm;
    while ((tm = tRegex.exec(m[1])) !== null) {
      texto += desescaparXmlTexto(tm[1]);
    }
    itens.push(texto);
  }
  return itens;
}

function localizarCelula(sheetXml, endereco) {
  const regex = new RegExp(`<c r="${endereco}"([^>]*?)(?:/>|>([\\s\\S]*?)</c>)`);
  return regex.exec(sheetXml);
}

function obterEstiloAtributo(atributos) {
  const m = /\ss="(\d+)"/.exec(atributos);
  return m ? ` s="${m[1]}"` : '';
}

function obterTextoOriginalCelula(sheetXml, sharedStrings, endereco) {
  const m = localizarCelula(sheetXml, endereco);
  if (!m) return '';
  const atributos = m[1];
  const conteudo = m[2] || '';
  if (/\bt="s"/.test(atributos)) {
    const vm = /<v>(\d+)<\/v>/.exec(conteudo);
    const idx = vm ? parseInt(vm[1], 10) : -1;
    return sharedStrings[idx] || '';
  }
  if (/\bt="inlineStr"/.test(atributos)) {
    const tm = /<t[^>]*>([\s\S]*?)<\/t>/.exec(conteudo);
    return tm ? desescaparXmlTexto(tm[1]) : '';
  }
  const vm = /<v>([\s\S]*?)<\/v>/.exec(conteudo);
  return vm ? desescaparXmlTexto(vm[1]) : '';
}

function definirCelulaTexto(sheetXml, endereco, texto) {
  const m = localizarCelula(sheetXml, endereco);
  if (!m) throw new Error(`Célula ${endereco} não encontrada no template Excel.`);
  const estilo = obterEstiloAtributo(m[1]);
  const novaCelula = `<c r="${endereco}"${estilo} t="inlineStr"><is><t xml:space="preserve">${escaparXmlTexto(texto)}</t></is></c>`;
  return sheetXml.slice(0, m.index) + novaCelula + sheetXml.slice(m.index + m[0].length);
}

function definirCelulaNumero(sheetXml, endereco, numero) {
  const m = localizarCelula(sheetXml, endereco);
  if (!m) throw new Error(`Célula ${endereco} não encontrada no template Excel.`);
  const estilo = obterEstiloAtributo(m[1]);
  const novaCelula = `<c r="${endereco}"${estilo}><v>${numero}</v></c>`;
  return sheetXml.slice(0, m.index) + novaCelula + sheetXml.slice(m.index + m[0].length);
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

async function gerarZipPreenchido(avaliacao) {
  const buffer = await carregarTemplateBuffer();
  const zip = await JSZip.loadAsync(buffer);

  const sheetFile = zip.file(SHEET_XML_PATH);
  const sharedStringsFile = zip.file(SHARED_STRINGS_PATH);
  if (!sheetFile || !sharedStringsFile) {
    throw new Error('Estrutura do template Excel não corresponde ao esperado (sheet1.xml/sharedStrings.xml não encontrados).');
  }

  const sharedStrings = parseSharedStrings(await sharedStringsFile.async('text'));
  let sheetXml = await sheetFile.async('text');

  const c = EXCEL_TEMPLATE.celulas;
  const cand = avaliacao.candidato;
  const ler = (endereco) => obterTextoOriginalCelula(sheetXml, sharedStrings, endereco);

  sheetXml = definirCelulaTexto(sheetXml, c.nomeCandidato, preencherRotulo(ler(c.nomeCandidato), cand.nome));
  sheetXml = definirCelulaTexto(sheetXml, c.avaliador, preencherRotulo(ler(c.avaliador), cand.avaliador));
  sheetXml = definirCelulaTexto(sheetXml, c.funcao, preencherRotulo(ler(c.funcao), cand.funcao));
  sheetXml = definirCelulaTexto(sheetXml, c.dataHorarioCompareceu, preencherDataHorarioCompareceu(ler(c.dataHorarioCompareceu), cand));
  sheetXml = definirCelulaTexto(sheetXml, c.placaAutomatizado, preencherPlacaAutomatizado(ler(c.placaAutomatizado), cand));

  // 25 critérios: marca a coluna da nota selecionada e grava o score do item.
  for (const grupoKey of GRUPOS_ORDEM) {
    for (const { key, linha } of linhasCriteriosGrupo(grupoKey)) {
      const nota = avaliacao[grupoKey][key];
      if (nota === null || nota === undefined) continue;
      const colNota = EXCEL_TEMPLATE.colunaNota[nota];
      sheetXml = definirCelulaTexto(sheetXml, `${colNota}${linha}`, EXCEL_TEMPLATE.marcaSelecao);
      sheetXml = definirCelulaNumero(sheetXml, `${EXCEL_TEMPLATE.colunaScoreItem}${linha}`, nota);
    }
  }

  const resultado = calcularScore(avaliacao);
  for (const grupoKey of GRUPOS_ORDEM) {
    sheetXml = definirCelulaNumero(sheetXml, EXCEL_TEMPLATE.celulaScoreGrupo[grupoKey], resultado.grupos[grupoKey].score);
  }
  sheetXml = definirCelulaNumero(sheetXml, EXCEL_TEMPLATE.celulaScoreTotal, resultado.total);

  sheetXml = definirCelulaTexto(sheetXml, c.treinamentoSim, preencherSimNao(ler(c.treinamentoSim), avaliacao.treinamento === true));
  sheetXml = definirCelulaTexto(sheetXml, c.treinamentoNao, preencherSimNao(ler(c.treinamentoNao), avaliacao.treinamento === false));
  sheetXml = definirCelulaTexto(sheetXml, c.contratacaoSim, preencherSimNao(ler(c.contratacaoSim), avaliacao.recomendaContratacao === true));
  sheetXml = definirCelulaTexto(sheetXml, c.contratacaoNao, preencherSimNao(ler(c.contratacaoNao), avaliacao.recomendaContratacao === false));

  // "Obs:" já existe no template (linha 39, logo após o SCORE TOTAL) — só anexa o texto.
  sheetXml = definirCelulaTexto(sheetXml, c.obs, preencherRotulo(ler(c.obs), avaliacao.parecer));

  // "Parecer" (B48:G49) nunca é escrito — permanece exatamente como está no template.

  const dataAssinatura = avaliacao.finalizadaEm ? formatarDataBR(avaliacao.finalizadaEm.slice(0, 10)) : formatarDataBR(hojeISO());
  sheetXml = definirCelulaTexto(sheetXml, c.assinatura, preencherAssinatura(ler(c.assinatura), {
    avaliador: cand.avaliador,
    data: dataAssinatura
  }));

  zip.file(SHEET_XML_PATH, sheetXml);
  return zip;
}

async function exportarAvaliacaoExcel(avaliacao) {
  const zip = await gerarZipPreenchido(avaliacao);
  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    compression: 'DEFLATE'
  });
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
