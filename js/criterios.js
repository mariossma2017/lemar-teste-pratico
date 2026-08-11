/**
 * Fonte única dos 25 critérios de avaliação (chave do app + rótulo exibido).
 * A ordem de cada array é a ordem oficial do formulário original.
 */
const CRITERIOS = {
  verificacoes: [
    { key: 'aguaOleoFluidos', label: 'Água/Óleo/Fluídos de freio e outros' },
    { key: 'pneusEstepe', label: 'Pneus/Estepe' },
    { key: 'ferramentas', label: 'Macaco/Chave roda/Extintor' },
    { key: 'documentoVeiculo', label: 'Documento do veículo' },
    { key: 'iluminacao', label: 'Iluminação' },
    { key: 'vazamentosAvarias', label: 'Vazamentos/Avarias/Danos' }
  ],
  habilidades: [
    { key: 'saidaVeiculo', label: 'Saída com o veículo' },
    { key: 'painelComandos', label: 'Observa painel e comandos' },
    { key: 'retrovisores', label: 'Utilização dos retrovisores' },
    { key: 'rotacaoTorqueVelocidade', label: 'Rotação/Torque/Velocidade' },
    { key: 'trocaMarchas', label: 'Troca de marchas' },
    { key: 'utilizacaoFreios', label: 'Utilização dos freios' },
    { key: 'meioFio', label: 'Meio-fio' },
    { key: 'marchaRe', label: 'Manobra em marcha ré' }
  ],
  comportamento: [
    { key: 'dominioVeiculo', label: 'Domínio do veículo na via' },
    { key: 'acliveDeclive', label: 'Aclive/Declive' },
    { key: 'sinalizacao', label: 'Sinalização horizontal/vertical' },
    { key: 'ultrapassagem', label: 'Ultrapassagem' },
    { key: 'embarqueDesembarque', label: 'Comportamento embarque/desembarque' },
    { key: 'mudancaFaixa', label: 'Manutenção e mudança de faixa' },
    { key: 'respeitoPedestres', label: 'Respeito aos pedestres e outros veículos' },
    { key: 'frenagem', label: 'Comportamento de frenagem' },
    { key: 'distanciaSeguimento', label: 'Distância de seguimento urbano/rodovia' },
    { key: 'utilizacaoSetas', label: 'Utilização de sinalização/indicação de setas' },
    { key: 'postura', label: 'Postura agressiva ou defensiva' }
  ]
};

const GRUPOS_ORDEM = ['verificacoes', 'habilidades', 'comportamento'];

const NOTAS_LABELS = {
  1: 'Muito Fraco',
  2: 'Fraco',
  3: 'Regular',
  4: 'Bom',
  5: 'Muito Bom'
};

function totalCriteriosGrupo(grupoKey) {
  return CRITERIOS[grupoKey].length;
}

function totalCriterios() {
  return GRUPOS_ORDEM.reduce((acc, g) => acc + CRITERIOS[g].length, 0);
}
