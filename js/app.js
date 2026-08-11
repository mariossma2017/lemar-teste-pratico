/**
 * Controlador principal do app — roteamento por hash e telas.
 * Sem framework: cada tela é uma função que monta HTML e liga os eventos.
 */

let AVALIACAO_ATUAL = null;
let ROTA_GRUPO_ANTERIOR = null;
let INDICE_ATIVO = 0;

// ---------------------------------------------------------------- roteador

function parseRoute() {
  const raw = location.hash || '#/';
  const pathPart = raw.split('?')[0];
  const parts = pathPart.replace(/^#\/?/, '').split('/').filter(Boolean);

  if (parts.length === 0) return { name: 'home' };
  if (parts[0] === 'nova') return { name: 'nova' };
  if (parts[0] === 'historico') return { name: 'historico' };
  if (parts[0] === 'config') return { name: 'config' };
  if (parts[0] === 'avaliacao' && parts[1]) {
    const id = parts[1];
    if (parts[2] === 'grupo' && parts[3]) return { name: 'grupo', id, grupo: parts[3] };
    if (parts[2] === 'parecer') return { name: 'parecer', id };
    if (parts[2] === 'resumo') return { name: 'resumo', id };
    return { name: 'dashboard', id };
  }
  return { name: 'home' };
}

async function render() {
  const rota = parseRoute();
  const app = document.getElementById('app');
  try {
    switch (rota.name) {
      case 'home': await renderHome(app); break;
      case 'nova': await renderNovaAvaliacao(app); break;
      case 'dashboard': await renderDashboard(app, rota.id); break;
      case 'grupo': await renderGrupo(app, rota.id, rota.grupo); break;
      case 'parecer': await renderParecer(app, rota.id); break;
      case 'resumo': await renderResumo(app, rota.id); break;
      case 'historico': await renderHistorico(app); break;
      case 'config': await renderConfig(app); break;
      default: await renderHome(app);
    }
    window.scrollTo(0, 0);
  } catch (err) {
    console.error(err);
    app.innerHTML = `<div class="container"><div class="vazio"><div class="icone">⚠️</div>Erro ao carregar a tela.<br>${escapeHtml(err.message)}</div></div>`;
  }
}

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', render);

// ---------------------------------------------------------------- utilidades de UI

function escapeHtml(str) {
  return String(str === null || str === undefined ? '' : str).replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}

function showToast(msg, duracao = 2200) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('visivel');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.remove('visivel'), duracao);
}

function formatarDataHoraBR(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()} ${hh}:${mi}`;
}

function corStatusVar(cls) {
  switch (cls) {
    case 'apto': return 'var(--verde)';
    case 'treinamento': return 'var(--amarelo-escuro)';
    case 'naoApto': return 'var(--vermelho)';
    default: return 'var(--cinza-status)';
  }
}

function badgeClasseELabel(r) {
  if (!r.completo && r.avaliados === 0) return { cls: 'incompleto', label: 'AVALIAÇÃO INCOMPLETA' };
  if (!r.classificacao) return { cls: 'incompleto', label: 'AVALIAÇÃO INCOMPLETA' };
  return { cls: r.classificacao.key, label: r.completo ? r.classificacao.label : `PROVISÓRIO: ${r.classificacao.label}` };
}

function shellHeader(navAtiva) {
  const itens = [
    { href: '#/', label: 'Início', key: 'home' },
    { href: '#/historico', label: 'Histórico', key: 'historico' },
    { href: '#/config', label: 'Config', key: 'config' }
  ];
  return `
  <header class="app-header">
    <div class="brand">
      <span class="logo-mark">LEMAR</span>
      <span class="brand-sub">Teste Prático de Motoristas</span>
    </div>
    <nav class="app-nav">
      ${itens.map((i) => `<a href="${i.href}" class="${i.key === navAtiva ? 'active' : ''}">${i.label}</a>`).join('')}
    </nav>
  </header>`;
}

function telaNaoEncontrada() {
  return `${shellHeader('home')}<div class="container"><div class="vazio"><div class="icone">🔍</div>Avaliação não encontrada.<br><br><a href="#/" class="btn btn-ghost">Voltar ao início</a></div></div>`;
}

// ---------------------------------------------------------------- home

async function renderHome(app) {
  const lista = await dbListarAvaliacoes();
  const recentes = lista.slice(0, 5);
  app.innerHTML = `
    ${shellHeader('home')}
    <div class="container">
      <a href="#/nova" class="btn btn-primary btn-block-gap" style="margin-top:20px;">+ NOVA AVALIAÇÃO</a>

      <div class="section-title">Avaliações recentes</div>
      ${recentes.length === 0
        ? `<div class="vazio"><div class="icone">📋</div>Nenhuma avaliação ainda.<br>Toque em "Nova Avaliação" para começar.</div>`
        : recentes.map((av) => cardHistoricoResumo(av)).join('')}
      ${lista.length > 5 ? `<a href="#/historico" class="btn btn-ghost">Ver histórico completo (${lista.length})</a>` : ''}
    </div>
  `;
}

function cardHistoricoResumo(av) {
  const r = calcularScore(av);
  const statusInfo = badgeClasseELabel(r);
  const destino = av.finalizada ? `#/avaliacao/${av.id}/resumo` : `#/avaliacao/${av.id}`;
  return `
  <a class="card-link" href="${destino}">
    <div class="card card-grupo">
      <div>
        <div class="titulo">${escapeHtml(av.candidato.nome || '(sem nome)')}</div>
        <div class="info">${formatarDataBR(av.candidato.dataTeste)}</div>
      </div>
      <div style="text-align:right;">
        <div class="score-mini">${r.total}/${SCORING_RULES.totalMax}</div>
        <div class="info" style="color:${corStatusVar(statusInfo.cls)};font-weight:700;">${statusInfo.label}</div>
      </div>
    </div>
  </a>`;
}

// ---------------------------------------------------------------- nova avaliação

async function renderNovaAvaliacao(app) {
  const config = configObter();
  app.innerHTML = `
    ${shellHeader('home')}
    <div class="container">
      <a href="#/" class="back-link">‹ Voltar</a>
      <div class="page-title">Nova Avaliação</div>
      <div class="page-subtitle">Etapa 1 — Identificação</div>
      <form id="form-nova">
        <div class="field">
          <label>Nome do candidato <span class="obrigatorio">*</span></label>
          <input class="input" name="nome" required autofocus>
          <div class="erro-campo" id="erro-nome" hidden></div>
        </div>
        <div class="field">
          <label>Data do teste</label>
          <input class="input" type="date" name="dataTeste" value="${hojeISO()}">
        </div>
        <div class="field">
          <label>Horário agendado</label>
          <input class="input" type="time" name="horario">
        </div>
        <div class="field">
          <label>Compareceu</label>
          <div class="toggle-group" data-toggle="compareceu">
            <div class="toggle-opcao sim selecionado" data-valor="true">Sim</div>
            <div class="toggle-opcao nao" data-valor="false">Não</div>
          </div>
        </div>
        <div class="field">
          <label>Avaliador</label>
          <input class="input" name="avaliador" value="${escapeHtml(config.avaliadorPadrao || '')}">
        </div>
        <div class="field">
          <label>Teste para função de</label>
          <input class="input" name="funcao" placeholder="Ex.: Motorista Carreteiro">
        </div>
        <div class="field">
          <label>Placa do veículo</label>
          <input class="input" name="placa" placeholder="ABC-1D23">
        </div>
        <div class="field">
          <label>Veículo automatizado</label>
          <div class="toggle-group" data-toggle="automatizado">
            <div class="toggle-opcao sim" data-valor="true">Sim</div>
            <div class="toggle-opcao nao selecionado" data-valor="false">Não</div>
          </div>
        </div>
        <button type="submit" class="btn btn-primary">INICIAR TESTE</button>
      </form>
    </div>
  `;

  app.querySelectorAll('.toggle-group').forEach((group) => {
    group.addEventListener('click', (e) => {
      const opt = e.target.closest('.toggle-opcao');
      if (!opt) return;
      group.querySelectorAll('.toggle-opcao').forEach((o) => o.classList.remove('selecionado'));
      opt.classList.add('selecionado');
    });
  });

  document.getElementById('form-nova').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const nome = (fd.get('nome') || '').trim();
    const errEl = document.getElementById('erro-nome');
    if (!nome) {
      errEl.textContent = 'Nome do candidato é obrigatório.';
      errEl.hidden = false;
      return;
    }
    const compareceu = app.querySelector('[data-toggle="compareceu"] .selecionado').dataset.valor === 'true';
    const automatizado = app.querySelector('[data-toggle="automatizado"] .selecionado').dataset.valor === 'true';
    const av = novaAvaliacao({
      nome,
      dataTeste: fd.get('dataTeste') || hojeISO(),
      horario: fd.get('horario') || '',
      compareceu,
      avaliador: (fd.get('avaliador') || '').trim(),
      funcao: (fd.get('funcao') || '').trim(),
      placa: (fd.get('placa') || '').trim(),
      automatizado
    });
    await dbSalvarAvaliacao(av);
    location.hash = `#/avaliacao/${av.id}`;
  });
}

// ---------------------------------------------------------------- dashboard da avaliação

async function renderDashboard(app, id) {
  const av = await dbObterAvaliacao(id);
  if (!av) { app.innerHTML = telaNaoEncontrada(); return; }
  AVALIACAO_ATUAL = av;

  const r = calcularScore(av);
  const statusInfo = badgeClasseELabel(r);
  const cardsGrupo = GRUPOS_ORDEM.map((g) => cardGrupoDashboard(av, r, g)).join('');
  const parecerPreenchido = !!(av.parecer && av.parecer.trim());

  let acaoFinal = '';
  if (av.finalizada) {
    acaoFinal = `
      <div class="card" style="background:var(--verde-bg);">
        <div style="font-weight:800;color:var(--verde);margin-bottom:10px;">✓ Avaliação finalizada em ${formatarDataHoraBR(av.finalizadaEm)}</div>
        <div class="btn-row">
          <a href="#/avaliacao/${av.id}/resumo" class="btn btn-dark btn-sm">VER RESULTADO</a>
          <button class="btn btn-outline btn-sm" id="btn-reabrir">REABRIR</button>
        </div>
      </div>`;
  } else if (r.completo) {
    acaoFinal = `<a href="#/avaliacao/${av.id}/resumo" class="btn btn-primary">VER RESUMO E FINALIZAR</a>`;
  } else {
    const pendentes = listarPendentes(av);
    acaoFinal = `
      <div class="aviso-pendentes">
        <div class="titulo">Faltam ${pendentes.length} avaliaç${pendentes.length === 1 ? 'ão' : 'ões'}</div>
        <ul>
          ${pendentes.slice(0, 8).map((p) => `<li><a href="#/avaliacao/${av.id}/grupo/${p.grupo}?item=${p.key}">${escapeHtml(p.label)}</a></li>`).join('')}
          ${pendentes.length > 8 ? `<li style="color:var(--grafite-claro);padding:6px 0;">+ ${pendentes.length - 8} outras...</li>` : ''}
        </ul>
      </div>`;
  }

  app.innerHTML = `
    ${shellHeader('home')}
    <div class="container">
      <a href="#/" class="back-link">‹ Voltar</a>

      <div class="score-hero">
        <div class="nome">${escapeHtml(av.candidato.nome)}</div>
        <div class="fracao">${r.total}<small>/${SCORING_RULES.totalMax}</small></div>
        <div class="percentual">${r.percentualConcluido}% concluído · ${r.avaliados}/${r.totalCriterios} critérios</div>
        <div class="progress-bar-track"><div class="progress-bar-fill" style="width:${r.percentualConcluido}%"></div></div>
        <div class="badge-status ${statusInfo.cls}">${statusInfo.label}</div>
      </div>

      ${cardsGrupo}

      <a href="#/avaliacao/${av.id}/parecer" class="card-link">
        <div class="card card-grupo">
          <div>
            <div class="titulo">Observações / Parecer</div>
            <div class="info">${parecerPreenchido ? 'Preenchido' : 'Ainda não preenchido'}</div>
          </div>
          <div class="chevron">›</div>
        </div>
      </a>

      ${acaoFinal}
    </div>
  `;

  const btnReabrir = document.getElementById('btn-reabrir');
  if (btnReabrir) {
    btnReabrir.addEventListener('click', async () => {
      av.finalizada = false;
      await dbSalvarAvaliacao(av);
      render();
    });
  }
}

function cardGrupoDashboard(av, r, grupoKey) {
  const info = r.grupos[grupoKey];
  const titulo = SCORING_RULES.grupos[grupoKey].label;
  const statusCls = info.completo ? info.status : 'INCOMPLETO';
  return `
  <a href="#/avaliacao/${av.id}/grupo/${grupoKey}" class="card-link">
    <div class="card card-grupo">
      <div>
        <div class="titulo"><span class="status-dot ${statusCls}"></span>${titulo}</div>
        <div class="info">${info.avaliados} de ${info.total} avaliados</div>
      </div>
      <div style="text-align:right;">
        <div class="score-mini">${info.score}/${info.max}</div>
        <div class="chevron">›</div>
      </div>
    </div>
  </a>`;
}

// ---------------------------------------------------------------- grupo (avaliação item a item)

async function renderGrupo(app, id, grupoKey) {
  const av = await dbObterAvaliacao(id);
  if (!av || !CRITERIOS[grupoKey]) { app.innerHTML = telaNaoEncontrada(); return; }
  AVALIACAO_ATUAL = av;

  const itens = CRITERIOS[grupoKey];
  const rotaAtual = `${id}:${grupoKey}`;
  const params = new URLSearchParams((location.hash.split('?')[1]) || '');
  const itemParam = params.get('item');

  if (itemParam) {
    const idx = itens.findIndex((i) => i.key === itemParam);
    INDICE_ATIVO = idx === -1 ? 0 : idx;
    history.replaceState(null, '', `#/avaliacao/${id}/grupo/${grupoKey}`);
  } else if (rotaAtual !== ROTA_GRUPO_ANTERIOR) {
    const primeiroPendente = itens.findIndex((i) => av[grupoKey][i.key] === null || av[grupoKey][i.key] === undefined);
    INDICE_ATIVO = primeiroPendente === -1 ? 0 : primeiroPendente;
  }
  ROTA_GRUPO_ANTERIOR = rotaAtual;
  if (INDICE_ATIVO >= itens.length) INDICE_ATIVO = itens.length - 1;
  if (INDICE_ATIVO < 0) INDICE_ATIVO = 0;

  const itemAtivo = itens[INDICE_ATIVO];
  const notaAtiva = av[grupoKey][itemAtivo.key];
  const r = calcularScore(av);
  const infoGrupo = r.grupos[grupoKey];

  app.innerHTML = `
    ${shellHeader('home')}
    <div class="container">
      <a href="#/avaliacao/${id}" class="back-link">‹ Voltar à avaliação</a>
      <div class="page-title">${SCORING_RULES.grupos[grupoKey].label}</div>
      <div class="page-subtitle">Score do grupo: ${infoGrupo.score}/${infoGrupo.max} · ${infoGrupo.avaliados}/${infoGrupo.total} avaliados</div>

      <div class="checklist">
        ${itens.map((it, idx) => {
          const nota = av[grupoKey][it.key];
          const feito = nota !== null && nota !== undefined;
          return `<div class="checklist-item ${feito ? 'feito' : 'pendente'} ${idx === INDICE_ATIVO ? 'ativo' : ''}" data-idx="${idx}">
            <span class="marca">${feito ? '✓' : '○'}</span>
            <span class="rotulo">${escapeHtml(it.label)}</span>
            ${feito ? `<span class="nota-mini">${nota}</span>` : ''}
          </div>`;
        }).join('')}
      </div>

      <div class="item-ativo-card">
        <div class="contador">Item ${INDICE_ATIVO + 1} de ${itens.length}</div>
        <div class="rotulo">${escapeHtml(itemAtivo.label)}</div>
        <div class="grade-buttons">
          ${[1, 2, 3, 4, 5].map((n) => `
            <div class="grade-btn n${n} ${notaAtiva === n ? 'selecionado' : ''}" data-nota="${n}">
              <span class="num">${n}</span>
              <span class="lbl">${NOTAS_LABELS[n]}</span>
            </div>`).join('')}
        </div>
        <div class="legenda-notas">Toque em uma nota para registrar</div>
        <div class="salvo-indicador">${notaAtiva ? 'Salvo automaticamente' : ''}</div>
      </div>

      <div class="btn-row">
        <button class="btn btn-outline" id="btn-anterior" ${INDICE_ATIVO === 0 ? 'disabled' : ''}>‹ Anterior</button>
        <button class="btn btn-outline" id="btn-proximo" ${INDICE_ATIVO === itens.length - 1 ? 'disabled' : ''}>Próximo ›</button>
      </div>
    </div>
  `;

  app.querySelectorAll('.checklist-item').forEach((el) => {
    el.addEventListener('click', () => {
      INDICE_ATIVO = parseInt(el.dataset.idx, 10);
      renderGrupo(app, id, grupoKey);
    });
  });

  app.querySelectorAll('.grade-btn').forEach((el) => {
    el.addEventListener('click', async () => {
      const nota = parseInt(el.dataset.nota, 10);
      av[grupoKey][itemAtivo.key] = nota;
      await dbSalvarAvaliacao(av);
      const proximoPendente = itens.findIndex((i, idx) => idx > INDICE_ATIVO && (av[grupoKey][i.key] === null || av[grupoKey][i.key] === undefined));
      if (proximoPendente !== -1) {
        INDICE_ATIVO = proximoPendente;
      } else if (INDICE_ATIVO < itens.length - 1) {
        INDICE_ATIVO += 1;
      }
      renderGrupo(app, id, grupoKey);
    });
  });

  document.getElementById('btn-anterior').addEventListener('click', () => {
    if (INDICE_ATIVO > 0) { INDICE_ATIVO -= 1; renderGrupo(app, id, grupoKey); }
  });
  document.getElementById('btn-proximo').addEventListener('click', () => {
    if (INDICE_ATIVO < itens.length - 1) { INDICE_ATIVO += 1; renderGrupo(app, id, grupoKey); }
  });
}

// ---------------------------------------------------------------- parecer

async function renderParecer(app, id) {
  const av = await dbObterAvaliacao(id);
  if (!av) { app.innerHTML = telaNaoEncontrada(); return; }
  const r = calcularScore(av);
  const sugestao = r.completo ? r.sugestaoTreinamento : null;

  app.innerHTML = `
    ${shellHeader('home')}
    <div class="container">
      <a href="#/avaliacao/${id}" class="back-link">‹ Voltar à avaliação</a>
      <div class="page-title">Observações / Parecer</div>

      <div class="field">
        <label>Parecer</label>
        <textarea class="textarea" id="campo-parecer" placeholder="Durante o teste apresentou bom domínio do veículo, porém...">${escapeHtml(av.parecer || '')}</textarea>
        <div class="salvo-indicador" id="salvo-parecer"></div>
      </div>

      <div class="field">
        <label>Indicação para Programa de Treinamento
          ${sugestao !== null ? `<span style="font-weight:400;color:var(--grafite-claro);">(sugestão automática: ${sugestao ? 'Sim' : 'Não'})</span>` : ''}
        </label>
        <div class="toggle-group" data-toggle="treinamento">
          <div class="toggle-opcao sim ${av.treinamento === true ? 'selecionado' : ''}" data-valor="true">Sim</div>
          <div class="toggle-opcao nao ${av.treinamento === false ? 'selecionado' : ''}" data-valor="false">Não</div>
        </div>
      </div>

      <div class="field">
        <label>Recomenda contratação?</label>
        <div class="toggle-group" data-toggle="contratacao">
          <div class="toggle-opcao sim ${av.recomendaContratacao === true ? 'selecionado' : ''}" data-valor="true">Sim</div>
          <div class="toggle-opcao nao ${av.recomendaContratacao === false ? 'selecionado' : ''}" data-valor="false">Não</div>
        </div>
      </div>

      <a href="#/avaliacao/${id}" class="btn btn-primary">CONCLUÍDO</a>
    </div>
  `;

  const campoParecer = document.getElementById('campo-parecer');
  let timer = null;
  campoParecer.addEventListener('input', () => {
    clearTimeout(timer);
    document.getElementById('salvo-parecer').textContent = '';
    timer = setTimeout(async () => {
      av.parecer = campoParecer.value;
      await dbSalvarAvaliacao(av);
      const ind = document.getElementById('salvo-parecer');
      if (ind) ind.textContent = 'Salvo automaticamente';
    }, 500);
  });

  app.querySelector('[data-toggle="treinamento"]').addEventListener('click', async (e) => {
    const opt = e.target.closest('.toggle-opcao');
    if (!opt) return;
    av.treinamento = opt.dataset.valor === 'true';
    await dbSalvarAvaliacao(av);
    renderParecer(app, id);
  });
  app.querySelector('[data-toggle="contratacao"]').addEventListener('click', async (e) => {
    const opt = e.target.closest('.toggle-opcao');
    if (!opt) return;
    av.recomendaContratacao = opt.dataset.valor === 'true';
    await dbSalvarAvaliacao(av);
    renderParecer(app, id);
  });
}

// ---------------------------------------------------------------- resumo / finalizar

async function renderResumo(app, id) {
  const av = await dbObterAvaliacao(id);
  if (!av) { app.innerHTML = telaNaoEncontrada(); return; }
  const r = calcularScore(av);
  const validacao = validarParaFinalizar(av);
  const fracos = listarPontosFracos(av);
  const fortes = listarPontosFortes(av);
  const statusInfo = badgeClasseELabel(r);

  const nomesStatus = { ADEQUADO: 'Adequado', ATENCAO: 'Atenção', CRITICO: 'Crítico' };

  app.innerHTML = `
    ${shellHeader('home')}
    <div class="container">
      <a href="#/avaliacao/${id}" class="back-link">‹ Voltar à avaliação</a>
      <div class="page-title">Resultado</div>

      <div class="score-hero">
        <div class="nome">${escapeHtml(av.candidato.nome)}</div>
        <div class="fracao">${r.total}<small>/${SCORING_RULES.totalMax}</small></div>
        <div class="badge-status ${statusInfo.cls}">${statusInfo.label}</div>
      </div>

      <div class="mini-cards">
        ${GRUPOS_ORDEM.map((g) => `
          <div class="mini-card">
            <div class="titulo">${SCORING_RULES.grupos[g].label}</div>
            <div class="valor">${r.grupos[g].score}/${r.grupos[g].max}</div>
            <div class="tag ${r.grupos[g].status}">${nomesStatus[r.grupos[g].status] || ''}</div>
          </div>`).join('')}
      </div>

      <div class="card">
        <div class="section-title" style="margin-top:0;">Recomenda contratação</div>
        <div style="font-weight:800;">${av.recomendaContratacao === true ? 'SIM' : av.recomendaContratacao === false ? 'NÃO' : 'Não informado'}</div>
      </div>

      ${fracos.length ? `
      <div class="section-title">Pontos de atenção</div>
      <ul class="lista-pontos fracos">${fracos.map((p) => `<li>${escapeHtml(p.label)}<span class="nota">Nota ${p.nota}</span></li>`).join('')}</ul>` : ''}

      ${fortes.length ? `
      <div class="section-title">Pontos positivos</div>
      <ul class="lista-pontos fortes">${fortes.map((p) => `<li>${escapeHtml(p.label)}<span class="nota">Nota ${p.nota}</span></li>`).join('')}</ul>` : ''}

      <div class="section-title">Parecer</div>
      <div class="card"><div class="parecer-preview">${escapeHtml(av.parecer || '(sem parecer registrado)')}</div></div>

      ${!validacao.valido ? `
      <div class="aviso-pendentes">
        <div class="titulo">Faltam ${validacao.pendentes.length} avaliações para finalizar</div>
        <ul>${validacao.pendentes.map((p) => `<li><a href="#/avaliacao/${av.id}/grupo/${p.grupo}?item=${p.key}">${escapeHtml(p.label)}</a></li>`).join('')}</ul>
      </div>` : ''}

      <div class="btn-row-export" style="margin-top:20px;">
        <button class="btn btn-dark" id="btn-exportar">EXPORTAR EXCEL</button>
        <button class="btn btn-dark" id="btn-exportar-pdf">EXPORTAR PDF</button>
      </div>
      <a href="#/avaliacao/${id}" class="btn btn-outline btn-block-gap">EDITAR</a>
      ${!av.finalizada
        ? `<button class="btn btn-primary btn-block-gap" id="btn-finalizar" ${!validacao.valido ? 'disabled' : ''}>FINALIZAR AVALIAÇÃO</button>`
        : `<div class="salvo-indicador" style="margin-top:12px;">Finalizada em ${formatarDataHoraBR(av.finalizadaEm)}</div>`}
    </div>

    <div class="modal-overlay" id="modal-finalizar" hidden>
      <div class="modal-box">
        <div class="titulo">Finalizar avaliação de ${escapeHtml(av.candidato.nome)}?</div>
        <div class="texto">Após finalizar, ainda é possível reabrir para edição a partir da tela da avaliação.</div>
        <div class="btn-row">
          <button class="btn btn-outline" id="modal-cancelar">Cancelar</button>
          <button class="btn btn-primary" id="modal-confirmar">Finalizar</button>
        </div>
      </div>
    </div>

    <div class="modal-overlay" id="modal-pdf" hidden>
      <div class="modal-box">
        <div class="titulo">PDF gerado com sucesso</div>
        <div class="texto">${escapeHtml(av.candidato.nome)} — ${r.total}/${SCORING_RULES.totalMax}</div>
        <div class="btn-row-export" id="pdf-modal-botoes"></div>
      </div>
    </div>
  `;

  document.getElementById('btn-exportar').addEventListener('click', async () => {
    try {
      await exportarAvaliacaoExcel(av);
      showToast('Excel exportado');
    } catch (err) {
      console.error(err);
      showToast('Erro ao exportar Excel');
    }
  });

  const btnExportarPdf = document.getElementById('btn-exportar-pdf');
  btnExportarPdf.addEventListener('click', async () => {
    btnExportarPdf.disabled = true;
    btnExportarPdf.classList.add('btn-loading');
    btnExportarPdf.textContent = 'GERANDO PDF...';
    try {
      const blob = await gerarBlobPDF(av);
      const nomeArquivo = nomeArquivoExportadoPDF(av);
      abrirModalPdf(blob, nomeArquivo, av);
    } catch (err) {
      console.error(err);
      showToast('Erro ao gerar PDF');
    } finally {
      btnExportarPdf.disabled = false;
      btnExportarPdf.classList.remove('btn-loading');
      btnExportarPdf.textContent = 'EXPORTAR PDF';
    }
  });

  const btnFinalizar = document.getElementById('btn-finalizar');
  if (btnFinalizar) {
    btnFinalizar.addEventListener('click', () => {
      document.getElementById('modal-finalizar').hidden = false;
    });
    document.getElementById('modal-cancelar').addEventListener('click', () => {
      document.getElementById('modal-finalizar').hidden = true;
    });
    document.getElementById('modal-confirmar').addEventListener('click', async () => {
      av.finalizada = true;
      av.finalizadaEm = new Date().toISOString();
      await dbSalvarAvaliacao(av);
      showToast('Avaliação finalizada');
      renderResumo(app, id);
    });
  }
}

function abrirModalPdf(blob, nomeArquivo, av) {
  const modal = document.getElementById('modal-pdf');
  const botoesEl = document.getElementById('pdf-modal-botoes');
  const file = new File([blob], nomeArquivo, { type: 'application/pdf' });
  const podeCompartilhar = suportaCompartilharArquivo(file);

  botoesEl.innerHTML = podeCompartilhar
    ? `<button class="btn btn-primary" id="btn-pdf-compartilhar">COMPARTILHAR</button><button class="btn btn-outline" id="btn-pdf-baixar">BAIXAR PDF</button>`
    : `<button class="btn btn-primary" id="btn-pdf-baixar">BAIXAR PDF</button>`;

  document.getElementById('btn-pdf-baixar').addEventListener('click', () => {
    baixarBlob(blob, nomeArquivo);
    modal.hidden = true;
    showToast('PDF baixado');
  });

  const btnCompartilhar = document.getElementById('btn-pdf-compartilhar');
  if (btnCompartilhar) {
    btnCompartilhar.addEventListener('click', async () => {
      try {
        await compartilharPDF(file, av);
        modal.hidden = true;
        showToast('PDF compartilhado');
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error(err);
          showToast('Não foi possível compartilhar');
        }
      }
    });
  }

  modal.hidden = false;
}

// ---------------------------------------------------------------- histórico

async function renderHistorico(app) {
  const lista = await dbListarAvaliacoes();
  app.innerHTML = `
    ${shellHeader('historico')}
    <div class="container">
      <div class="page-title">Avaliações</div>
      ${lista.length === 0
        ? `<div class="vazio"><div class="icone">📋</div>Nenhuma avaliação registrada.</div>`
        : lista.map((av) => cardHistoricoCompleto(av)).join('')}
    </div>
    <div class="modal-overlay" id="modal-excluir" hidden>
      <div class="modal-box">
        <div class="titulo">Excluir avaliação?</div>
        <div class="texto" id="texto-excluir"></div>
        <div class="btn-row">
          <button class="btn btn-outline" id="cancelar-excluir">Cancelar</button>
          <button class="btn btn-danger" id="confirmar-excluir">Excluir</button>
        </div>
      </div>
    </div>
  `;

  let idParaExcluir = null;

  app.querySelectorAll('[data-acao]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const idAlvo = btn.dataset.id;
      const acao = btn.dataset.acao;
      const av = await dbObterAvaliacao(idAlvo);
      if (!av) return;

      if (acao === 'ver') {
        location.hash = av.finalizada ? `#/avaliacao/${idAlvo}/resumo` : `#/avaliacao/${idAlvo}`;
      } else if (acao === 'editar') {
        location.hash = `#/avaliacao/${idAlvo}`;
      } else if (acao === 'duplicar') {
        const copia = JSON.parse(JSON.stringify(av));
        copia.id = gerarId();
        copia.candidato.nome = `${av.candidato.nome} (cópia)`;
        copia.finalizada = false;
        copia.finalizadaEm = null;
        copia.criadaEm = new Date().toISOString();
        copia.atualizadaEm = copia.criadaEm;
        await dbSalvarAvaliacao(copia);
        showToast('Avaliação duplicada');
        renderHistorico(app);
      } else if (acao === 'exportar') {
        try { await exportarAvaliacaoExcel(av); showToast('Excel exportado'); }
        catch (err) { console.error(err); showToast('Erro ao exportar Excel'); }
      } else if (acao === 'exportar-pdf') {
        btn.disabled = true;
        try {
          const blob = await gerarBlobPDF(av);
          baixarBlob(blob, nomeArquivoExportadoPDF(av));
          showToast('PDF exportado');
        } catch (err) {
          console.error(err);
          showToast('Erro ao gerar PDF');
        } finally {
          btn.disabled = false;
        }
      } else if (acao === 'excluir') {
        idParaExcluir = idAlvo;
        document.getElementById('texto-excluir').textContent = `Tem certeza que deseja excluir a avaliação de ${av.candidato.nome}? Esta ação não pode ser desfeita.`;
        document.getElementById('modal-excluir').hidden = false;
      }
    });
  });

  document.getElementById('cancelar-excluir').addEventListener('click', () => {
    document.getElementById('modal-excluir').hidden = true;
  });
  document.getElementById('confirmar-excluir').addEventListener('click', async () => {
    if (idParaExcluir) {
      await dbExcluirAvaliacao(idParaExcluir);
      showToast('Avaliação excluída');
    }
    document.getElementById('modal-excluir').hidden = true;
    renderHistorico(app);
  });
}

function cardHistoricoCompleto(av) {
  const r = calcularScore(av);
  const statusInfo = badgeClasseELabel(r);
  return `
  <div class="hist-card">
    <div class="topo">
      <div>
        <div class="nome">${escapeHtml(av.candidato.nome || '(sem nome)')}</div>
        <div class="data">${formatarDataBR(av.candidato.dataTeste)}${av.finalizada ? ' · Finalizada' : ' · Em andamento'}</div>
      </div>
      <div>
        <div class="score">${r.total}/${SCORING_RULES.totalMax}</div>
        <div class="resultado-label" style="color:${corStatusVar(statusInfo.cls)};">${statusInfo.label}</div>
      </div>
    </div>
    <div class="acoes">
      <button class="btn btn-sm btn-outline" data-acao="ver" data-id="${av.id}">Ver</button>
      <button class="btn btn-sm btn-outline" data-acao="editar" data-id="${av.id}">Editar</button>
      <button class="btn btn-sm btn-outline" data-acao="duplicar" data-id="${av.id}">Duplicar</button>
      <button class="btn btn-sm btn-outline" data-acao="exportar" data-id="${av.id}">Excel</button>
      <button class="btn btn-sm btn-outline" data-acao="exportar-pdf" data-id="${av.id}">PDF</button>
      <button class="btn btn-sm btn-danger" data-acao="excluir" data-id="${av.id}">Excluir</button>
    </div>
  </div>`;
}

// ---------------------------------------------------------------- configurações

async function renderConfig(app) {
  const config = configObter();
  app.innerHTML = `
    ${shellHeader('config')}
    <div class="container">
      <div class="page-title">Configurações</div>

      <div class="field">
        <label>Avaliador padrão</label>
        <input class="input" id="campo-avaliador-padrao" value="${escapeHtml(config.avaliadorPadrao || '')}" placeholder="Nome do avaliador">
      </div>
      <button class="btn btn-primary" id="btn-salvar-config">SALVAR</button>

      <hr class="divisor">

      <div class="section-title" style="margin-top:0;">Backup</div>
      <p style="font-size:13px;color:var(--grafite-claro);">Exporte todas as avaliações em um arquivo JSON para não perder os dados caso o navegador seja limpo.</p>
      <button class="btn btn-dark" id="btn-backup">BACKUP (exportar JSON)</button>

      <div class="section-title">Restaurar backup</div>
      <p style="font-size:13px;color:var(--grafite-claro);">Selecione um arquivo JSON exportado anteriormente. Avaliações existentes não são apagadas.</p>
      <div class="btn btn-outline file-btn-wrapper">
        RESTAURAR BACKUP
        <input type="file" accept="application/json" id="input-restaurar">
      </div>

      <hr class="divisor">
      <div class="section-title" style="margin-top:0;">Sobre</div>
      <p style="font-size:13px;color:var(--grafite-claro);">LEMAR | Teste Prático — Avaliação Prática de Motoristas.<br>Todos os dados ficam salvos apenas neste dispositivo.</p>
    </div>
  `;

  document.getElementById('btn-salvar-config').addEventListener('click', () => {
    configSalvar({ ...config, avaliadorPadrao: document.getElementById('campo-avaliador-padrao').value.trim() });
    showToast('Configuração salva');
  });

  document.getElementById('btn-backup').addEventListener('click', async () => {
    const lista = await dbListarAvaliacoes();
    const conteudo = { tipo: 'lemar-teste-pratico-backup', versao: 1, exportadoEm: new Date().toISOString(), avaliacoes: lista };
    const blob = new Blob([JSON.stringify(conteudo, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-teste-pratico-lemar-${hojeISO()}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
    showToast('Backup exportado');
  });

  document.getElementById('input-restaurar').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const texto = await file.text();
      const dados = JSON.parse(texto);
      const lista = Array.isArray(dados) ? dados : dados.avaliacoes;
      if (!Array.isArray(lista)) throw new Error('Arquivo inválido');
      await dbImportarAvaliacoes(lista);
      showToast(`${lista.length} avaliações restauradas`);
    } catch (err) {
      console.error(err);
      showToast('Erro ao restaurar backup');
    }
    e.target.value = '';
  });
}
