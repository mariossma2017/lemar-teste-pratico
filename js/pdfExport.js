/**
 * Geração do PDF (documento próprio, fiel ao formulário oficial) e
 * compartilhamento via Web Share API, com fallback para download.
 */

function aguardarImagens(elemento) {
  const imgs = Array.from(elemento.querySelectorAll('img'));
  return Promise.all(imgs.map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    });
  }));
}

async function gerarBlobPDF(avaliacao) {
  const elemento = montarElementoDocumentoPDF(avaliacao);
  document.body.appendChild(elemento);
  try {
    await aguardarImagens(elemento);
    const canvas = await html2canvas(elemento, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      width: PDF_LARGURA_PX,
      windowWidth: PDF_LARGURA_PX
    });

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    const larguraPaginaMm = 210;
    const alturaPaginaMm = 297;
    let desenhoLarguraMm = larguraPaginaMm;
    let desenhoAlturaMm = (canvas.height * larguraPaginaMm) / canvas.width;

    if (desenhoAlturaMm > alturaPaginaMm) {
      const fator = alturaPaginaMm / desenhoAlturaMm;
      desenhoAlturaMm = alturaPaginaMm;
      desenhoLarguraMm = larguraPaginaMm * fator;
    }
    const offsetXMm = (larguraPaginaMm - desenhoLarguraMm) / 2;

    doc.addImage(imgData, 'JPEG', offsetXMm, 0, desenhoLarguraMm, desenhoAlturaMm);
    return doc.output('blob');
  } finally {
    document.body.removeChild(elemento);
  }
}

function nomeArquivoExportadoPDF(avaliacao) {
  const nome = sanitizarNomeArquivo(avaliacao.candidato.nome) || 'Candidato';
  const dataBR = formatarDataBR(avaliacao.candidato.dataTeste).replace(/\//g, '-') || 'data';
  return `Teste_Pratico_${nome}_${dataBR}.pdf`;
}

function baixarBlob(blob, nomeArquivo) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

function suportaCompartilharArquivo(file) {
  return !!(navigator.canShare && navigator.share && navigator.canShare({ files: [file] }));
}

async function compartilharPDF(file, avaliacao) {
  await navigator.share({
    title: 'Teste Prático de Motorista',
    text: `Teste Prático - ${avaliacao.candidato.nome}`,
    files: [file]
  });
}
