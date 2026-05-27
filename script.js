/*
  Página CIMOP - Itens 8.1 e 8.4
  Objetivo: tentar alimentar automaticamente pela API de Dados Abertos do TCE/RN.
  ATENÇÃO: o Swagger do TCE/RN pode usar nomes próprios de endpoints e parâmetros. Se a consulta não retornar dados,
  abra https://apidadosabertos.tce.rn.gov.br//swagger/ui/index, localize o método de licitações/contratações e ajuste
  as constantes ENDPOINT_LICITACOES e ENDPOINT_DOCUMENTOS abaixo.
*/
const CONFIG = {
  orgaoNome: "CONSÓRCIO INTERMUNICIPAL MULTIFINALITÁRIO DOS MUNICÍPIOS DO OESTE POTIGUAR",
  orgaoTermosBusca: [
    "CONSÓRCIO INTERMUNICIPAL MULTIFINALITÁRIO DOS MUNICÍPIOS DO OESTE POTIGUAR",
    "CONSORCIO INTERMUNICIPAL MULTIFINALITARIO DOS MUNICIPIOS DO OESTE POTIGUAR",
    "CIMOP",
    "OESTE POTIGUAR"
  ],
  baseApi: "https://apidadosabertos.tce.rn.gov.br",
  swaggerDocsPossiveis: [
    "/swagger/docs/v1",
    "/swagger/docs/V1",
    "/swagger/v1/swagger.json"
  ],
  // Quando identificar no Swagger os endpoints exatos, preencha aqui. Exemplo: "/api/Licitacoes".
  ENDPOINT_LICITACOES: "",
  ENDPOINT_DOCUMENTOS: "",
  exercicios: [2026, 2025, 2024, 2023, 2022, 2021],
  fallbackLicitacoes: "dados/licitacoes-cimop-exemplo.json",
  fallbackDocumentos: "dados/documentos-cimop-exemplo.json"
};

let anoSelecionado = "todos";
let dadosLicitacoes = [];
let dadosDocumentos = [];
let tentativasRealizadas = [];

function setStatusApi(texto){const el=document.getElementById("statusApi"); if(el) el.textContent = texto;}
function preencherData(){const el=document.getElementById("dataHoje"); if(el){const hoje=new Date(); el.innerHTML=hoje.toLocaleDateString("pt-BR")+" às "+hoje.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});}}
function semAcento(v){return String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase();}
function contemTermoOrgao(obj){const texto=semAcento(JSON.stringify(obj)); return CONFIG.orgaoTermosBusca.some(t=>texto.includes(semAcento(t)));}
function extrairLista(dados){
  if(Array.isArray(dados)) return dados;
  const chaves=["items","data","dados","resultado","result","value","registros","licitacoes","contratacoes"];
  for(const c of chaves){ if(Array.isArray(dados?.[c])) return dados[c]; }
  for(const v of Object.values(dados||{})){ if(Array.isArray(v)) return v; }
  return [];
}
async function fetchJson(url){
  tentativasRealizadas.push(url);
  const r = await fetch(url, {headers:{"Accept":"application/json"}});
  if(!r.ok) throw new Error(`HTTP ${r.status}`);
  const ct = r.headers.get("content-type") || "";
  if(!ct.includes("json") && !ct.includes("text")) throw new Error("Resposta não JSON");
  return await r.json();
}
function montarUrls(endpoint, ano){
  const e = endpoint.startsWith("http") ? endpoint : CONFIG.baseApi + endpoint;
  const orgao = encodeURIComponent(CONFIG.orgaoNome);
  return [
    `${e}?exercicio=${ano}&formato=json&nomeUnidadeGestora=${orgao}`,
    `${e}?ano=${ano}&formato=json&nomeUnidadeGestora=${orgao}`,
    `${e}?Exercicio=${ano}&Formato=json&NomeUnidadeGestora=${orgao}`,
    `${e}?exercicio=${ano}&format=json&orgao=${orgao}`,
    `${e}?ano=${ano}&format=json&orgao=${orgao}`,
    `${e}?exercicio=${ano}&formato=json`,
    `${e}?ano=${ano}&formato=json`,
    `${e}?Exercicio=${ano}&Formato=json`
  ];
}
async function descobrirEndpointsSwagger(){
  const encontrados = { licitacoes: [], documentos: [] };
  for(const doc of CONFIG.swaggerDocsPossiveis){
    try{
      const swagger = await fetchJson(CONFIG.baseApi + doc);
      const paths = Object.keys(swagger.paths || {});
      encontrados.licitacoes.push(...paths.filter(p => /licit|contrat|dispensa|inexig/i.test(p)));
      encontrados.documentos.push(...paths.filter(p => /document|arquivo|licit|contrat|dispensa|inexig/i.test(p)));
    }catch(e){ console.warn("Swagger não acessível:", doc, e); }
  }
  encontrados.licitacoes = [...new Set(encontrados.licitacoes)];
  encontrados.documentos = [...new Set(encontrados.documentos)];
  return encontrados;
}
async function consultarEndpoint(endpoint, normalizador){
  const acumulado = [];
  for(const ano of CONFIG.exercicios){
    for(const url of montarUrls(endpoint, ano)){
      try{
        const bruto = await fetchJson(url);
        let lista = extrairLista(bruto);
        if(lista.length){
          const filtrada = lista.filter(contemTermoOrgao);
          const usar = filtrada.length ? filtrada : lista;
          acumulado.push(...usar.map(x => normalizador(x, ano, url)));
          break;
        }
      }catch(e){ console.warn("Falha na consulta:", url, e); }
    }
  }
  return deduplicar(acumulado);
}
async function carregarJSONLocal(caminho){try{const r=await fetch(caminho); if(!r.ok) return []; return await r.json();}catch(e){return [];}}
async function carregarDadosAutomaticos(){
  setStatusApi("Consultando API do TCE/RN...");
  tentativasRealizadas = [];
  let endpoints = {licitacoes:[], documentos:[]};
  if(CONFIG.ENDPOINT_LICITACOES) endpoints.licitacoes.push(CONFIG.ENDPOINT_LICITACOES);
  if(CONFIG.ENDPOINT_DOCUMENTOS) endpoints.documentos.push(CONFIG.ENDPOINT_DOCUMENTOS);

  if(!endpoints.licitacoes.length || !endpoints.documentos.length){
    const descobertos = await descobrirEndpointsSwagger();
    endpoints.licitacoes.push(...descobertos.licitacoes);
    endpoints.documentos.push(...descobertos.documentos);
  }

  if(!endpoints.licitacoes.length){
    endpoints.licitacoes = ["/api/Licitacoes", "/api/licitacoes", "/api/Licitacao", "/api/licitacao", "/api/Contratacoes", "/api/contratacoes"];
  }
  if(!endpoints.documentos.length){
    endpoints.documentos = ["/api/DocumentosLicitacao", "/api/documentoslicitacao", "/api/ArquivosLicitacao", "/api/licitacoes/documentos", "/api/Contratacoes"];
  }

  for(const ep of [...new Set(endpoints.licitacoes)]){
    const dados = await consultarEndpoint(ep, normalizarLicitacaoApi);
    if(dados.length){dadosLicitacoes = dados; break;}
  }
  for(const ep of [...new Set(endpoints.documentos)]){
    const dados = await consultarEndpoint(ep, normalizarDocumentoApi).then(x => x.filter(ehContratacaoDireta));
    if(dados.length){dadosDocumentos = dados; break;}
  }

  if(!dadosLicitacoes.length){dadosLicitacoes = await carregarJSONLocal(CONFIG.fallbackLicitacoes);}
  if(!dadosDocumentos.length){dadosDocumentos = await carregarJSONLocal(CONFIG.fallbackDocumentos);}

  if(dadosLicitacoes.length || dadosDocumentos.length){
    setStatusApi("Dados carregados. Verifique a fonte/detalhes de cada registro.");
  }else{
    setStatusApi("API não retornou dados para o CIMOP. Ajuste os endpoints no script.js.");
  }
}
function valorCampo(item, nomes){for(const n of nomes){if(item?.[n]!==undefined && item?.[n]!==null && item?.[n]!=="") return item[n];} return "";}
function normalizarLicitacaoApi(item, anoPadrao, urlFonte){
  const modalidade = valorCampo(item,["modalidade","nomeModalidade","Modalidade","descricaoModalidade","tipoLicitacao","TipoLicitacao"]);
  const numero = valorCampo(item,["numero","numeroLicitacao","NumeroLicitacao","numLicitacao","codigoLicitacao","nrLicitacao","processo","numeroProcesso"]);
  return {
    ano: valorCampo(item,["ano","exercicio","Exercicio","ANO","anoLicitacao"]) || anoPadrao,
    ordem: valorCampo(item,["ordem","sequencial","Sequencial","numeroSequencial","codigo","id"]) || numero,
    numero,
    modalidade,
    objeto: valorCampo(item,["objeto","descricaoObjeto","Objeto","objetivo","descricao","historico"]),
    dataSessao: formatarData(valorCampo(item,["dataSessao","dataAbertura","DataAbertura","dataCertame","data","dtAbertura"])),
    valorEstimado: formatarMoeda(valorCampo(item,["valorEstimado","valorPrevisto","ValorEstimado","valorOrcado","valorReferencia"])),
    valorHomologado: formatarMoeda(valorCampo(item,["valorHomologado","valorContratado","ValorHomologado","valorAdjudicado","valor"])),
    situacao: valorCampo(item,["situacao","status","Situacao","fase","andamento"]),
    fonte: valorCampo(item,["fonte","link","url","arquivo","detalhes"]) || urlFonte
  };
}
function normalizarDocumentoApi(item, anoPadrao, urlFonte){
  const modalidade = valorCampo(item,["modalidade","nomeModalidade","Modalidade","tipoContratacao","tipo"]);
  return {
    ano: valorCampo(item,["ano","exercicio","Exercicio","ANO"]) || anoPadrao,
    processo: valorCampo(item,["processo","numeroProcesso","Processo","numero","numeroLicitacao","numProcesso"]),
    modalidade,
    objeto: valorCampo(item,["objeto","descricaoObjeto","Objeto","descricao","objetivo","historico"]),
    fornecedor: valorCampo(item,["fornecedor","contratado","nomeFornecedor","razaoSocial","credor"]),
    valor: formatarMoeda(valorCampo(item,["valor","valorContratado","valorHomologado","Valor","valorTotal"])),
    termoReferencia: valorCampo(item,["termoReferencia","linkTermoReferencia","projetoBasico","linkProjetoBasico","urlTermoReferencia"]),
    justificativa: valorCampo(item,["justificativa","linkJustificativa","justificativaPreco","urlJustificativa"]),
    parecer: valorCampo(item,["parecer","parecerJuridico","linkParecer","urlParecer"]),
    homologacao: valorCampo(item,["homologacao","ratificacao","atoHomologacao","linkHomologacao","urlHomologacao","arquivo"]) || urlFonte,
    situacao: valorCampo(item,["situacao","status","Situacao","fase"])
  };
}
function ehContratacaoDireta(item){const m=semAcento(item.modalidade); return m.includes("DISPENSA") || m.includes("INEXIG");}
function deduplicar(lista){const mapa=new Map(); lista.forEach(x=>{const k=semAcento(`${x.ano}|${x.numero||x.processo}|${x.modalidade}|${x.objeto}`); if(!mapa.has(k)) mapa.set(k,x)}); return [...mapa.values()];}
function formatarData(valor){if(!valor)return""; const d=new Date(valor); return isNaN(d)?String(valor):d.toLocaleDateString("pt-BR");}
function formatarMoeda(valor){if(valor===null||valor===undefined||valor==="")return""; if(typeof valor==="string"&&valor.includes("R$"))return valor; const n=Number(String(valor).replace(/\./g,"").replace(",",".")); return isNaN(n)?valor:n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});}
function statusClasse(status){const s=semAcento(status); if(s.includes("ABERT")||s.includes("ANDAMENTO")||s.includes("REABERT")||s.includes("RETIFIC")||s.includes("PUBLIC"))return"status-vigente"; if(s.includes("SUSPENS")||s.includes("DESERT")||s.includes("FRACASS")||s.includes("REVOG"))return"status-alerta"; return"status-encerrado";}
function linkBotao(caminho,texto="Acessar"){if(!caminho||String(caminho).trim()==="")return'<span class="sem-link">Não anexado</span>';return`<a href="${caminho}" target="_blank" class="botao">${texto}</a>`;}
function aplicarAno(dados){return anoSelecionado==="todos" ? dados : dados.filter(x=>String(x.ano)===String(anoSelecionado));}
function montarFiltrosAnos(...listas){const anos=[...new Set(listas.flat().map(x=>x.ano).filter(Boolean))].sort((a,b)=>String(b).localeCompare(String(a))); const box=document.getElementById("filtrosAno"); if(!box)return; box.innerHTML=`<button class="ativo" onclick="selecionarAno('todos', this)">Todos os anos</button>`+anos.map(ano=>`<button onclick="selecionarAno('${ano}', this)">${ano}</button>`).join("");}
function selecionarAno(ano,botao){anoSelecionado=ano; document.querySelectorAll(".filtros-ano button").forEach(b=>b.classList.remove("ativo")); botao.classList.add("ativo"); renderizarTudo();}
function preencherLicitacoes(){const tabela=document.getElementById("tabelaLicitacoes"); const dados=aplicarAno(dadosLicitacoes).sort((a,b)=>String(a.ano).localeCompare(String(b.ano))||String(a.ordem).localeCompare(String(b.ordem),undefined,{numeric:true})); if(!dados.length){tabela.innerHTML='<tr><td colspan="9" class="linha-vazia">Não há licitações retornadas para o filtro selecionado.</td></tr>';return;} tabela.innerHTML=dados.map(item=>`<tr><td>${item.ano??""}</td><td>${item.ordem??""}</td><td><strong>${item.numero??""}</strong><br>${item.modalidade??""}</td><td>${item.objeto??""}</td><td>${item.dataSessao??""}</td><td>${item.valorEstimado??""}</td><td>${item.valorHomologado??""}</td><td><span class="status ${statusClasse(item.situacao)}">${item.situacao??""}</span></td><td>${linkBotao(item.fonte,"Detalhes")}</td></tr>`).join("");}
function preencherDocumentos(){const tabela=document.getElementById("tabelaDocumentos"); const dados=aplicarAno(dadosDocumentos).sort((a,b)=>String(a.ano).localeCompare(String(b.ano))||String(a.processo).localeCompare(String(b.processo),undefined,{numeric:true})); if(!dados.length){tabela.innerHTML='<tr><td colspan="11" class="linha-vazia">Não há documentos de dispensa ou inexigibilidade retornados para o filtro selecionado.</td></tr>';return;} tabela.innerHTML=dados.map(item=>`<tr><td>${item.ano??""}</td><td>${item.processo??""}</td><td>${item.modalidade??""}</td><td>${item.objeto??""}</td><td>${item.fornecedor??""}</td><td>${item.valor??""}</td><td>${linkBotao(item.termoReferencia,"TR/PB")}</td><td>${linkBotao(item.justificativa,"Justificativa")}</td><td>${linkBotao(item.parecer,"Parecer")}</td><td>${linkBotao(item.homologacao,"Homologação")}</td><td><span class="status ${statusClasse(item.situacao)}">${item.situacao??""}</span></td></tr>`).join("");}
function renderizarTudo(){preencherLicitacoes(); preencherDocumentos(); filtrarTabelas();}
async function iniciarPagina(){preencherData(); await carregarDadosAutomaticos(); montarFiltrosAnos(dadosLicitacoes,dadosDocumentos); renderizarTudo();}
async function recarregarDados(){dadosLicitacoes=[]; dadosDocumentos=[]; await carregarDadosAutomaticos(); montarFiltrosAnos(dadosLicitacoes,dadosDocumentos); renderizarTudo();}
function filtrarTabelas(){const termo=document.getElementById("campoBusca")?.value.toLowerCase()||""; document.querySelectorAll("tbody tr").forEach(linha=>{linha.style.display=linha.innerText.toLowerCase().includes(termo)?"":"none";});}
function obterDadosDasTabelas(){const dados=[]; document.querySelectorAll(".bloco").forEach(bloco=>{const titulo=bloco.querySelector("h3")?.innerText||"Seção"; const tabela=bloco.querySelector("table"); if(!tabela)return; const cabecalhos=Array.from(tabela.querySelectorAll("thead th")).map(th=>th.innerText.trim()); tabela.querySelectorAll("tbody tr").forEach(tr=>{if(tr.style.display==="none")return; const colunas=Array.from(tr.querySelectorAll("td")).map(td=>td.innerText.trim()); if(colunas.length===cabecalhos.length){const item={secao:titulo}; cabecalhos.forEach((c,i)=>item[c]=colunas[i]); dados.push(item);}});}); return dados;}
function baixarArquivo(conteudo,nomeArquivo,tipo){const blob=new Blob([conteudo],{type:tipo}); const link=document.createElement("a"); link.href=URL.createObjectURL(blob); link.download=nomeArquivo; link.click();}
function nomeBase(){return document.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");}
function exportarCSV(){const dados=obterDadosDasTabelas(); if(!dados.length)return alert("Nenhum dado disponível para exportação."); const colunas=Object.keys(dados[0]); const linhas=[colunas.join(";"),...dados.map(item=>colunas.map(coluna=>`"${String(item[coluna]??"").replace(/"/g,'""')}"`).join(";"))]; baixarArquivo("\uFEFF"+linhas.join("\n"),nomeBase()+".csv","text/csv;charset=utf-8;");}
function exportarJSON(){baixarArquivo(JSON.stringify(obterDadosDasTabelas(),null,2),nomeBase()+".json","application/json;charset=utf-8;");}
function exportarXML(){const dados=obterDadosDasTabelas(); let xml=`<?xml version="1.0" encoding="UTF-8"?>\n<registros>\n`; dados.forEach(item=>{xml+="  <registro>\n"; Object.entries(item).forEach(([chave,valor])=>{const tag=chave.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9]/g,"_").toLowerCase(); xml+=`    <${tag}>${String(valor).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</${tag}>\n`;}); xml+="  </registro>\n";}); xml+="</registros>"; baixarArquivo(xml,nomeBase()+".xml","application/xml;charset=utf-8;");}
function exportarXLSX(){const dados=obterDadosDasTabelas(); if(!dados.length)return alert("Nenhum dado disponível para exportação."); const planilha=XLSX.utils.json_to_sheet(dados); const pasta=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(pasta,planilha,"Dados"); XLSX.writeFile(pasta,nomeBase()+".xlsx");}
function exportarPDF(){const dados=obterDadosDasTabelas(); const{jsPDF}=window.jspdf; const doc=new jsPDF("landscape"); doc.setFontSize(14); doc.text(document.title,14,15); if(!dados.length){doc.text("Nenhum dado disponível para exportação.",14,30); doc.save(nomeBase()+".pdf"); return;} const colunas=Object.keys(dados[0]); const linhas=dados.map(item=>colunas.map(coluna=>item[coluna])); doc.autoTable({head:[colunas],body:linhas,startY:25,styles:{fontSize:6,cellPadding:1.5},headStyles:{fillColor:[7,55,99]}}); doc.save(nomeBase()+".pdf");}
iniciarPagina();
