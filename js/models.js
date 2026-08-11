/**
 * Criação de novas avaliações e utilitários de id/data.
 */

function gerarId() {
  return 'av_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function hojeISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function horaAgora() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function novaAvaliacao(candidatoInfo) {
  const grupoVazio = (grupoKey) => {
    const obj = {};
    for (const item of CRITERIOS[grupoKey]) obj[item.key] = null;
    return obj;
  };

  const agora = new Date().toISOString();

  return {
    id: gerarId(),
    candidato: {
      nome: candidatoInfo.nome || '',
      dataTeste: candidatoInfo.dataTeste || hojeISO(),
      horario: candidatoInfo.horario || '',
      compareceu: candidatoInfo.compareceu !== undefined ? candidatoInfo.compareceu : true,
      avaliador: candidatoInfo.avaliador || '',
      funcao: candidatoInfo.funcao || '',
      placa: candidatoInfo.placa || '',
      automatizado: candidatoInfo.automatizado !== undefined ? candidatoInfo.automatizado : false
    },

    verificacoes: grupoVazio('verificacoes'),
    habilidades: grupoVazio('habilidades'),
    comportamento: grupoVazio('comportamento'),

    parecer: '',
    treinamento: null,
    recomendaContratacao: null,

    finalizada: false,
    criadaEm: agora,
    atualizadaEm: agora,
    finalizadaEm: null
  };
}

function formatarDataBR(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
}
