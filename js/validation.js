/**
 * Validações de formulário.
 */

function validarIdentificacao(candidato) {
  const erros = {};
  if (!candidato.nome || !candidato.nome.trim()) {
    erros.nome = 'Nome do candidato é obrigatório.';
  }
  return { valido: Object.keys(erros).length === 0, erros };
}

function validarParaFinalizar(avaliacao) {
  const pendentes = listarPendentes(avaliacao);
  return { valido: pendentes.length === 0, pendentes };
}
