# LEMAR | Teste Prático

Aplicativo web/PWA para digitalizar o **Teste Prático de Motoristas** da LEMAR Transportes. Substitui o preenchimento em papel/Excel: o avaliador registra as 25 notas pelo celular durante o teste, o app calcula tudo automaticamente e gera, ao final, o Excel oficial preenchido — visualmente igual ao formulário original.

100% client-side (HTML + CSS + JavaScript puro, sem build, sem backend, sem login). Funciona offline como PWA instalável.

## Como usar

1. Abra o app e toque em **+ Nova Avaliação**.
2. Preencha a identificação do candidato (nome é obrigatório) e toque em **Iniciar Teste**.
3. Na tela da avaliação, toque em cada um dos três grupos (**Verificações**, **Habilidades**, **Comportamento**) e registre a nota de 1 a 5 de cada critério — um toque já salva e recalcula tudo.
4. Preencha **Observações / Parecer**, a indicação de treinamento e a recomendação de contratação.
5. Quando os 25 critérios estiverem avaliados, toque em **Ver Resumo e Finalizar** para conferir o resultado e finalizar.
6. Toque em **Exportar Excel** para baixar o arquivo preenchido no padrão oficial da LEMAR.

Todas as avaliações ficam salvas no próprio dispositivo (mesmo sem internet) e podem ser consultadas, editadas, duplicadas ou excluídas em **Histórico**.

## Como instalar (PWA)

- **Celular (Android/iOS):** abra a URL do app no navegador e use a opção "Adicionar à tela inicial" / "Instalar app" do menu do navegador.
- **Desktop (Chrome/Edge):** clique no ícone de instalação na barra de endereço.

Depois de instalado, o app funciona normalmente sem internet — inclusive a exportação para Excel.

## Como executar localmente

Não há build nem dependências para instalar. Basta servir a pasta como arquivos estáticos, por exemplo:

```bash
python -m http.server 8745
```

E acessar `http://localhost:8745`.

## Onde fica o template Excel

O formulário oficial (`templates/teste-pratico-motoristas.xlsx`) é o **template original da LEMAR**, mantido intacto. A exportação nunca recria o Excel do zero: ela carrega esse arquivo, preenche as células correspondentes e gera uma cópia nova — o template original nunca é alterado.

## Arquitetura

```
index.html                  Shell da aplicação (SPA por hash-routing)
css/styles.css               Identidade visual LEMAR (amarelo/preto/grafite), mobile-first
js/
  criterios.js                Os 25 critérios (fonte única de verdade: chave + rótulo)
  scoringRules.js              Regras de pontuação/classificação (faixas configuráveis)
  scoring.js                   Cálculo de score a partir dos dados de uma avaliação
  models.js                    Criação de novas avaliações, helpers de data/id
  database.js                  Persistência (IndexedDB + localStorage para config)
  validation.js                Validações de formulário e de finalização
  excelTemplateMap.js          Mapeamento app ↔ células do Excel (única fonte de verdade)
  excelExport.js               Geração do Excel preenchido a partir do template (ExcelJS)
  app.js                       Roteamento por hash e todas as telas
  vendor/exceljs.min.js        Biblioteca ExcelJS (vendorizada para funcionar offline)
templates/teste-pratico-motoristas.xlsx   Template oficial (não é alterado)
manifest.json, service-worker.js, icons/  PWA
```

Todos os dados ficam em **IndexedDB** (banco `lemarTestePraticoDB`, store `avaliacoes`). O único uso de `localStorage` é a configuração de avaliador padrão (`lemarTP_config`). O app publicado sempre inicia vazio — não há dados fictícios embutidos no código.

## Como alterar os critérios

Edite `js/criterios.js`. A ordem de cada array (`verificacoes`, `habilidades`, `comportamento`) é a ordem em que os itens aparecem no app **e** a ordem das linhas no Excel (ver seção abaixo). Se adicionar, remover ou reordenar critérios, é obrigatório atualizar também `linhaInicialGrupo` em `js/excelTemplateMap.js` e as linhas correspondentes no arquivo `.xlsx` do template.

## Como alterar as regras de pontuação

Edite `js/scoringRules.js` — pontuação máxima por grupo, faixas de "ponto de atenção", "ponto de corte" e as faixas de classificação final (Apto / Treinamento / Não apto) estão todas centralizadas nesse arquivo, isoladas do resto do código.

## Como alterar o mapeamento do Excel

Edite `js/excelTemplateMap.js`. Esse arquivo é a única fonte de verdade sobre qual célula do template recebe cada dado: identificação do candidato, colunas de nota (1 a 5), coluna de score, células de score por grupo, score total, treinamento/contratação e parecer. As funções `preencher*` nunca hardcodam o texto fixo do formulário — elas sempre partem do texto que já está na célula do template, garantindo que rótulos e legendas originais nunca sejam alterados.

## Backup e restauração

Em **Configurações**, é possível exportar todas as avaliações em um arquivo JSON (**Backup**) e importá-las de volta em outro dispositivo/navegador (**Restaurar Backup**). A restauração nunca apaga avaliações existentes — apenas adiciona/atualiza por id.
