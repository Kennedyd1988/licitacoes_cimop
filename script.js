let dadosLicitacoes = [];
let dadosDispensas = [];
let dadosFiltrados = [];
let paginaAtual = 1;
const itensPorPagina = 10;

async function carregarJSON(caminho){
  try{
    const resposta = await fetch(caminho);
    if(!resposta.ok) throw new Error(`Erro ao carregar ${caminho}`);
    return await resposta.json();
  }catch(erro){
    console.error(erro);
    return [];
  }
}

function statusClasse(status){
  if(!status) return "status-encerrado";
  const s = status.toLowerCase();
  return s.includes("homolog") || s.includes("public") || s.includes("abert") || s.includes("andamento") || s.includes("formal") ? "status-vigente" : "status-encerrado";
}

function linksDocs(docs){
  if(!docs || !docs.length) return "Não anexado";
  return `<div class="docs-lista">${docs.map((d,i)=>`<a href="${d.url}" target="_blank" class="${i===0?'botao':'botao-secundario'}">${d.nome || ('Documento ' + (i+1))}</a>`).join("")}</div>`;
}

function objetoCelula(texto){
  return `<div class="objeto-resumido" title="${String(texto || "").replace(/"/g, '&quot;')}">${texto || ""}</div>`;
}

function preencherData(){
  const el = document.getElementById("dataHoje");
  if(el){
    const hoje = new Date();
    el.innerHTML = hoje.toLocaleDateString("pt-BR") + " às " + hoje.toLocaleTimeString("pt-BR", {hour:"2-digit", minute:"2-digit"});
  }
}

function aplicarFiltro(dados){
  const termo = document.getElementById("campoBusca")?.value.toLowerCase() || "";
  if(!termo) return dados;
  return dados.filter(item => JSON.stringify(item).toLowerCase().includes(termo));
}

function atualizarPaginacao(){
  const info = document.getElementById("infoPagina");
  const anterior = document.getElementById("btnAnterior");
  const proxima = document.getElementById("btnProxima");
  if(!info) return;

  const totalPaginas = Math.max(1, Math.ceil(dadosFiltrados.length / itensPorPagina));
  info.innerText = `Página ${paginaAtual} de ${totalPaginas} — ${dadosFiltrados.length} registro(s)`;

  if(anterior) anterior.disabled = paginaAtual <= 1;
  if(proxima) proxima.disabled = paginaAtual >= totalPaginas;
}

function paginaAnterior(){
  if(paginaAtual > 1){
    paginaAtual--;
    renderizarTabelaAtual();
  }
}

function proximaPagina(){
  const totalPaginas = Math.max(1, Math.ceil(dadosFiltrados.length / itensPorPagina));
  if(paginaAtual < totalPaginas){
    paginaAtual++;
    renderizarTabelaAtual();
  }
}

function renderizarTabelaAtual(){
  if(window.tipoPagina === "licitacoes"){
    renderizarLicitacoes();
  }

  if(window.tipoPagina === "dispensas"){
    renderizarDispensas();
  }

  atualizarPaginacao();
}

function fatiaPagina(){
  const inicio = (paginaAtual - 1) * itensPorPagina;
  return dadosFiltrados.slice(inicio, inicio + itensPorPagina);
}

function renderizarLicitacoes(){
  const tabela = document.getElementById("tabelaLicitacoes");
  if(!tabela) return;

  if(!dadosFiltrados.length){
    tabela.innerHTML = `<tr><td colspan="7" class="linha-vazia">Nenhum registro localizado.</td></tr>`;
    return;
  }

  tabela.innerHTML = fatiaPagina().map(item => `
    <tr>
      <td>${item.ano}</td>
      <td>${item.numeroModalidade}</td>
      <td>${objetoCelula(item.objeto)}</td>
      <td>${item.dataAbertura}</td>
      <td>${item.valorEstimadoHomologado}</td>
      <td><span class="status ${statusClasse(item.situacao)}">${item.situacao}</span></td>
      <td>${linksDocs(item.documentos)}</td>
    </tr>
  `).join("");
}

function renderizarDispensas(){
  const tabela = document.getElementById("tabelaDispensas");
  if(!tabela) return;

  if(!dadosFiltrados.length){
    tabela.innerHTML = `<tr><td colspan="9" class="linha-vazia">Nenhum registro localizado.</td></tr>`;
    return;
  }

  tabela.innerHTML = fatiaPagina().map(item => `
    <tr>
      <td>${item.ano}</td>
      <td>${item.numeroProcesso}</td>
      <td>${item.numeroModalidade}</td>
      <td>${objetoCelula(item.objeto)}</td>
      <td>${item.data}</td>
      <td>${item.valorContratado}</td>
      <td>${item.credorCpfCnpj}</td>
      <td><span class="status ${statusClasse(item.situacao)}">${item.situacao}</span></td>
      <td>${linksDocs(item.documentos)}</td>
    </tr>
  `).join("");
}

async function iniciarPagina(){
  preencherData();

  if(window.tipoPagina === "licitacoes"){
    dadosLicitacoes = await carregarJSON("dados/licitacoes.json");
    dadosFiltrados = dadosLicitacoes;
    renderizarTabelaAtual();
  }

  if(window.tipoPagina === "dispensas"){
    dadosDispensas = await carregarJSON("dados/dispensas-inexigibilidades.json");
    dadosFiltrados = dadosDispensas;
    renderizarTabelaAtual();
  }
}

function filtrarTabelas(){
  paginaAtual = 1;

  if(window.tipoPagina === "licitacoes"){
    dadosFiltrados = aplicarFiltro(dadosLicitacoes);
  }

  if(window.tipoPagina === "dispensas"){
    dadosFiltrados = aplicarFiltro(dadosDispensas);
  }

  renderizarTabelaAtual();
}

function obterDadosDasTabelas(){
  const dados = [];
  const fonte = window.tipoPagina === "licitacoes" ? dadosFiltrados : dadosFiltrados;

  if(window.tipoPagina === "licitacoes"){
    return fonte.map(item => ({
      "Ano": item.ano,
      "Número / Modalidade": item.numeroModalidade,
      "Objeto": item.objeto,
      "Data da sessão de abertura": item.dataAbertura,
      "Valor estimado / homologado": item.valorEstimadoHomologado,
      "Situação": item.situacao,
      "Documentos": (item.documentos || []).map(d => d.url).join(" | ")
    }));
  }

  if(window.tipoPagina === "dispensas"){
    return fonte.map(item => ({
      "Ano": item.ano,
      "Processo": item.numeroProcesso,
      "Número / Modalidade": item.numeroModalidade,
      "Objeto": item.objeto,
      "Data": item.data,
      "Valor contratado": item.valorContratado,
      "CPF/CNPJ credor": item.credorCpfCnpj,
      "Situação": item.situacao,
      "Documentos principais": (item.documentos || []).map(d => d.url).join(" | ")
    }));
  }

  return dados;
}

function baixarArquivo(conteudo,nomeArquivo,tipo){
  const blob = new Blob([conteudo],{type:tipo});
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = nomeArquivo;
  link.click();
}

function nomeBase(){
  return document.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
}

function exportarCSV(){
  const dados = obterDadosDasTabelas();
  if(!dados.length) return alert("Nenhum dado disponível para exportação.");
  const colunas = Object.keys(dados[0]);
  const linhas = [
    colunas.join(";"),
    ...dados.map(item => colunas.map(coluna => `"${String(item[coluna] ?? "").replace(/"/g,'""')}"`).join(";"))
  ];
  baixarArquivo("\uFEFF" + linhas.join("\n"), nomeBase() + ".csv", "text/csv;charset=utf-8;");
}

function exportarJSON(){
  baixarArquivo(JSON.stringify(obterDadosDasTabelas(), null, 2), nomeBase() + ".json", "application/json;charset=utf-8;");
}

function exportarXML(){
  const dados = obterDadosDasTabelas();
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<registros>\n`;

  dados.forEach(item => {
    xml += "  <registro>\n";
    Object.entries(item).forEach(([chave, valor]) => {
      const tag = chave.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9]/g,"_").toLowerCase();
      xml += `    <${tag}>${String(valor).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</${tag}>\n`;
    });
    xml += "  </registro>\n";
  });

  xml += "</registros>";
  baixarArquivo(xml, nomeBase() + ".xml", "application/xml;charset=utf-8;");
}

function exportarXLSX(){
  const dados = obterDadosDasTabelas();
  if(!dados.length) return alert("Nenhum dado disponível para exportação.");
  const planilha = XLSX.utils.json_to_sheet(dados);
  const pasta = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(pasta, planilha, "Dados");
  XLSX.writeFile(pasta, nomeBase() + ".xlsx");
}

function exportarPDF(){
  const dados = obterDadosDasTabelas();
  const {jsPDF} = window.jspdf;
  const doc = new jsPDF("landscape");
  doc.setFontSize(14);
  doc.text(document.title, 14, 15);

  if(!dados.length){
    doc.text("Nenhum dado disponível para exportação.", 14, 30);
    doc.save(nomeBase() + ".pdf");
    return;
  }

  const colunas = Object.keys(dados[0]);
  const linhas = dados.map(item => colunas.map(coluna => item[coluna]));

  doc.autoTable({
    head:[colunas],
    body:linhas,
    startY:25,
    styles:{fontSize:7,cellPadding:2},
    headStyles:{fillColor:[7,55,99]}
  });

  doc.save(nomeBase() + ".pdf");
}

iniciarPagina();
