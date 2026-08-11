/**
 * Monta o documento HTML (formato A4) usado para gerar o PDF do Teste Prático.
 * É uma estrutura própria, dedicada a impressão/exportação — não é a tela do app.
 * Segue o mesmo mapeamento de dados usado na exportação Excel (js/excelTemplateMap.js),
 * mas o "Parecer" aqui é SEMPRE deixado em branco (preenchimento manual posterior).
 */

const PDF_LARGURA_PX = 794; // 210mm a 96dpi
const PDF_ALTURA_PX = 1123; // 297mm a 96dpi

function marcaX(condicao) {
  return condicao ? 'X' : '';
}

function pdfTituloClassificacao(r) {
  if (!r.completo) return { texto: 'AVALIAÇÃO INCOMPLETA', classe: 'cinza' };
  const classes = { apto: 'verde', treinamento: 'amarelo', naoApto: 'vermelho' };
  return { texto: r.classificacao.label, classe: classes[r.classificacao.key] || 'cinza' };
}

function pdfLinhasGrupo(avaliacao, grupoKey, rotuloGrupo) {
  const itens = CRITERIOS[grupoKey];
  return itens.map((item, idx) => {
    const nota = avaliacao[grupoKey][item.key];
    const celulaGrupo = idx === 0
      ? `<td class="grupo-label" rowspan="${itens.length}">${escapeHtml(rotuloGrupo)}</td>`
      : '';
    const notas = [1, 2, 3, 4, 5].map((n) => `<td class="nota">${nota === n ? 'X' : ''}</td>`).join('');
    return `<tr>${celulaGrupo}<td class="item-label">${escapeHtml(item.label)}</td>${notas}<td class="score">${nota || ''}</td></tr>`;
  }).join('');
}

function montarElementoDocumentoPDF(avaliacao) {
  const r = calcularScore(avaliacao);
  const cand = avaliacao.candidato;
  const dataBR = formatarDataBR(cand.dataTeste);
  const classificacao = pdfTituloClassificacao(r);
  const dataAssinatura = avaliacao.finalizadaEm ? formatarDataBR(avaliacao.finalizadaEm.slice(0, 10)) : formatarDataBR(hojeISO());

  const wrapper = document.createElement('div');
  wrapper.id = 'pdf-doc-root';
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-99999px';
  wrapper.style.top = '0';
  wrapper.style.width = `${PDF_LARGURA_PX}px`;
  wrapper.style.background = '#ffffff';

  wrapper.innerHTML = `
    <style>
      #pdf-doc-root, #pdf-doc-root * { box-sizing: border-box; }
      #pdf-doc-root {
        font-family: Arial, Helvetica, sans-serif;
        color: #000000;
        font-size: 9px;
        padding: 26px 28px;
        width: ${PDF_LARGURA_PX}px;
        background: #ffffff;
      }
      .pdf-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
      .pdf-header img { height: 34px; }
      .pdf-brand-l1 { font-size: 15px; font-weight: 800; letter-spacing: 0.4px; }
      .pdf-brand-l2 { font-size: 9px; color: #444444; font-weight: 700; letter-spacing: 0.6px; }
      .pdf-campo {
        border: 1px solid #000000; border-bottom: none;
        padding: 4px 8px; font-weight: 700; font-size: 9px;
      }
      .pdf-campo.ultimo { border-bottom: 1px solid #000000; }
      .pdf-legenda {
        border: 1px solid #000000; border-top: none;
        background: #808080; color: #ffffff;
        text-align: center; font-weight: 700; font-size: 9px; padding: 4px;
      }
      table.pdf-grade { width: 100%; border-collapse: collapse; margin-top: 6px; table-layout: fixed; }
      table.pdf-grade th, table.pdf-grade td {
        border: 1px solid #000000; padding: 3px 5px; font-size: 8.5px; overflow-wrap: break-word;
      }
      table.pdf-grade thead th { background: #808080; color: #ffffff; font-weight: 700; text-align: center; }
      table.pdf-grade col.col-grupo { width: 9%; }
      table.pdf-grade col.col-item { width: 41%; }
      table.pdf-grade col.col-nota { width: 6.5%; }
      table.pdf-grade col.col-score { width: 9.5%; }
      td.grupo-label {
        background: #3a3d40; color: #ffffff; font-weight: 800; text-align: center; vertical-align: middle;
        font-size: 7.5px; letter-spacing: 0.2px; word-break: keep-all; padding: 3px 2px;
      }
      td.item-label { text-align: left; }
      td.nota, td.score { text-align: center; font-weight: 800; }
      td.score { background: #f2f2f2; }

      table.pdf-grupos { width: 100%; border-collapse: collapse; margin-top: 8px; }
      table.pdf-grupos th, table.pdf-grupos td { border: 1px solid #000000; padding: 3px 6px; font-size: 8.5px; text-align: center; }
      table.pdf-grupos thead th { background: #808080; color: #ffffff; font-weight: 700; }
      table.pdf-grupos td.rotulo { text-align: left; font-weight: 700; }

      .pdf-score-total-row {
        display: flex; align-items: center; justify-content: space-between;
        border: 2px solid #000000; border-top: none; padding: 6px 8px; margin-top: -1px;
      }
      .pdf-score-total { font-size: 12px; font-weight: 800; }
      .pdf-classificacao { font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 3px; }
      .pdf-classificacao.verde { background: #e6f5ec; color: #1f8a4d; }
      .pdf-classificacao.amarelo { background: #fff4cc; color: #8a6d00; }
      .pdf-classificacao.vermelho { background: #fbe9e7; color: #c0392b; }
      .pdf-classificacao.cinza { background: #ececec; color: #575b5e; }

      .pdf-obs-box { border: 1px solid #000000; border-top: none; padding: 6px 8px; font-size: 9px; min-height: 34px; }
      .pdf-obs-box b { font-weight: 800; }

      .pdf-simnao-row {
        display: flex; align-items: center; justify-content: space-between; gap: 10px;
        border: 1px solid #000000; border-top: none; padding: 5px 8px; font-size: 9px; font-weight: 700;
      }

      .pdf-parecer-box { border: 1px solid #000000; border-top: none; margin-bottom: 0; }
      .pdf-parecer-titulo { text-align: center; font-size: 14px; font-weight: 800; padding: 6px; border-bottom: 1px solid #000000; }
      .pdf-parecer-vazio { min-height: 130px; }

      .pdf-assinatura { border: 1px solid #000000; border-top: none; padding: 8px; font-size: 9px; }
    </style>

    <div class="pdf-header">
      <img src="${LOGO_LEMAR_BASE64}" alt="LEMAR">
      <div>
        <div class="pdf-brand-l1">LEMAR TRANSPORTES</div>
        <div class="pdf-brand-l2">TESTE PRÁTICO DE MOTORISTAS</div>
      </div>
    </div>

    <div class="pdf-campo">Nome Candidato: <b>${escapeHtml(cand.nome)}</b></div>
    <div class="pdf-campo">Data teste: <b>${escapeHtml(dataBR)}</b>&nbsp;&nbsp;&nbsp;Horário agendado <b>${escapeHtml(cand.horario || '')}</b>hs&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Compareceu&nbsp;&nbsp;&nbsp;&nbsp;SIM ( ${marcaX(cand.compareceu === true)} )&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Não ( ${marcaX(cand.compareceu === false)} )</div>
    <div class="pdf-campo">Avaliador: <b>${escapeHtml(cand.avaliador)}</b></div>
    <div class="pdf-campo">TESTE PARA FUNÇÃO DE: <b>${escapeHtml(cand.funcao)}</b></div>
    <div class="pdf-campo ultimo">Placa Veículo <b>${escapeHtml(cand.placa)}</b>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Automatizado&nbsp;&nbsp;&nbsp;Sim ( ${marcaX(cand.automatizado === true)} )&nbsp;&nbsp;&nbsp;Não ( ${marcaX(cand.automatizado === false)} )</div>

    <div class="pdf-legenda">LEGENDA: 1-Muito fraco&nbsp;&nbsp;&nbsp;&nbsp;2-Fraco&nbsp;&nbsp;&nbsp;&nbsp;3-Regular&nbsp;&nbsp;&nbsp;&nbsp;4-Bom&nbsp;&nbsp;&nbsp;&nbsp;5-Muito bom</div>

    <table class="pdf-grade">
      <colgroup>
        <col class="col-grupo"><col class="col-item">
        <col class="col-nota"><col class="col-nota"><col class="col-nota"><col class="col-nota"><col class="col-nota">
        <col class="col-score">
      </colgroup>
      <thead>
        <tr><th colspan="2">ÍTEM EM AVALIAÇÃO</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>SCORE</th></tr>
      </thead>
      <tbody>
        ${pdfLinhasGrupo(avaliacao, 'verificacoes', 'VERIFICAÇÕES')}
        ${pdfLinhasGrupo(avaliacao, 'habilidades', 'HABILIDADES')}
        ${pdfLinhasGrupo(avaliacao, 'comportamento', 'COMPORTAMENTO')}
      </tbody>
    </table>

    <table class="pdf-grupos">
      <thead><tr><th style="text-align:left;">GRUPOS DE AVALIAÇÃO</th><th>PTS</th><th>PONTO ATENÇÃO</th><th>PONTO DE CORTE</th></tr></thead>
      <tbody>
        <tr><td class="rotulo">VERIFICAÇÃO</td><td>${r.grupos.verificacoes.score}</td><td>11 A 18 PTS</td><td>&lt; 10 PTS</td></tr>
        <tr><td class="rotulo">HABILIDADE</td><td>${r.grupos.habilidades.score}</td><td>17 A 24 PTS</td><td>&lt; 16 PTS</td></tr>
        <tr><td class="rotulo">COMPORTAMENTO</td><td>${r.grupos.comportamento.score}</td><td>34 A 43 PTS</td><td>&lt; 33 PTS</td></tr>
      </tbody>
    </table>

    <div class="pdf-score-total-row">
      <div class="pdf-score-total">SCORE TOTAL: ${r.total} / ${SCORING_RULES.totalMax}</div>
      <div class="pdf-classificacao ${classificacao.classe}">${escapeHtml(classificacao.texto)}</div>
    </div>

    <div class="pdf-obs-box"><b>Obs:</b> ${escapeHtml(avaliacao.parecer || '')}</div>

    <div class="pdf-simnao-row">
      <span>INDICAÇÃO PARA PROGRAMA DE TREINAMENTO SCORE 61 a 89 PONTOS</span>
      <span>SIM ( ${marcaX(avaliacao.treinamento === true)} )</span>
      <span>NÃO ( ${marcaX(avaliacao.treinamento === false)} )</span>
    </div>
    <div class="pdf-simnao-row">
      <span>RECOMENDA CONTRATAÇÃO</span>
      <span>SIM ( ${marcaX(avaliacao.recomendaContratacao === true)} )</span>
      <span>NÃO ( ${marcaX(avaliacao.recomendaContratacao === false)} )</span>
    </div>

    <div class="pdf-parecer-box">
      <div class="pdf-parecer-titulo">Parecer</div>
      <div class="pdf-parecer-vazio"></div>
    </div>

    <div class="pdf-assinatura">Nome: ${escapeHtml(cand.avaliador)} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Data: ${escapeHtml(dataAssinatura)}</div>
  `;

  return wrapper;
}
