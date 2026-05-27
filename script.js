const API =
"https://apidadosabertos.tce.rn.gov.br/api/ProcedimentosLicitatoriosApi/LicitacaoPublica/Json/1307/2023-01-01/2026-12-31";

let dadosLicitacoes = [];
let anoSelecionado = "todos";

function preencherData(){
    const el = document.getElementById("dataHoje");
    if(el){
        const hoje = new Date();
        el.innerHTML =
            hoje.toLocaleDateString("pt-BR") +
            " às " +
            hoje.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit"
            });
    }
}

function semAcento(v){
    return String(v ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase();
}

function formatarData(valor){
    if(!valor) return "";

    const d = new Date(valor);

    return isNaN(d)
        ? valor
        : d.toLocaleDateString("pt-BR");
}

function formatarMoeda(valor){

    if(valor === null || valor === undefined || valor === "")
        return "";

    const numero = Number(valor);

    if(isNaN(numero))
        return valor;

    return numero.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function statusClasse(status){

    const s = semAcento(status);

    if(
        s.includes("ABERT") ||
        s.includes("ANDAMENTO") ||
        s.includes("PUBLIC")
    ){
        return "status-vigente";
    }

    if(
        s.includes("SUSPENS") ||
        s.includes("FRACASS") ||
        s.includes("DESERT")
    ){
        return "status-alerta";
    }

    return "status-encerrado";
}

function linkBotao(link){

    if(!link)
        return '<span class="sem-link">Sem link</span>';

    return `<a href="${link}" target="_blank" class="botao">Detalhes</a>`;
}

function montarFiltrosAnos(){

    const anos = [...new Set(
        dadosLicitacoes.map(x => x.ano)
    )].sort((a,b) => b-a);

    const box = document.getElementById("filtrosAno");

    box.innerHTML =
        `<button class="ativo" onclick="selecionarAno('todos', this)">Todos</button>` +
        anos.map(
            ano => `<button onclick="selecionarAno('${ano}', this)">${ano}</button>`
        ).join("");
}

function selecionarAno(ano, botao){

    anoSelecionado = ano;

    document.querySelectorAll(".filtros-ano button")
        .forEach(b => b.classList.remove("ativo"));

    botao.classList.add("ativo");

    preencherTabela();
}

async function carregarDados(){

    try{

        const resposta = await fetch(API);

        const dados = await resposta.json();

        dadosLicitacoes = dados.map((item, index) => ({

            ano:
                item.ANO ||
                item.ano ||
                "",

            ordem:
                index + 1,

            numero:
                item.NUMERO ||
                item.numero ||
                "",

            modalidade:
                item.MODALIDADE ||
                item.modalidade ||
                "",

            objeto:
                item.OBJETO ||
                item.objeto ||
                "",

            dataSessao:
                formatarData(
                    item.DATAABERTURA ||
                    item.dataAbertura
                ),

            valorEstimado:
                formatarMoeda(
                    item.VALORESTIMADO ||
                    item.valorEstimado
                ),

            valorHomologado:
                formatarMoeda(
                    item.VALORHOMOLOGADO ||
                    item.valorHomologado
                ),

            situacao:
                item.SITUACAO ||
                item.situacao ||
                "",

            fonte:
                item.URL ||
                item.url ||
                API
        }))
        .filter(item => {

            const modalidade = semAcento(item.modalidade);

            return !modalidade.includes("DISPENSA")
                && !modalidade.includes("INEXIG");
        });

        montarFiltrosAnos();

        preencherTabela();

    }catch(e){

        console.error(e);

        document.getElementById("tabelaLicitacoes").innerHTML =
            `<tr>
                <td colspan="9" class="linha-vazia">
                    Não foi possível carregar os dados.
                </td>
            </tr>`;
    }
}

function preencherTabela(){

    const tabela = document.getElementById("tabelaLicitacoes");

    let dados = dadosLicitacoes;

    if(anoSelecionado !== "todos"){
        dados = dados.filter(
            x => String(x.ano) === String(anoSelecionado)
        );
    }

    if(!dados.length){

        tabela.innerHTML =
            `<tr>
                <td colspan="9" class="linha-vazia">
                    Nenhum registro encontrado.
                </td>
            </tr>`;

        return;
    }

    tabela.innerHTML = dados.map(item => `

        <tr>

            <td>${item.ano}</td>

            <td>${item.ordem}</td>

            <td>
                <strong>${item.numero}</strong>
                <br>
                ${item.modalidade}
            </td>

            <td>${item.objeto}</td>

            <td>${item.dataSessao}</td>

            <td>${item.valorEstimado}</td>

            <td>${item.valorHomologado}</td>

            <td>
                <span class="status ${statusClasse(item.situacao)}">
                    ${item.situacao}
                </span>
            </td>

            <td>${linkBotao(item.fonte)}</td>

        </tr>

    `).join("");

    filtrarTabelas();
}

function filtrarTabelas(){

    const termo =
        document.getElementById("campoBusca")
        ?.value
        .toLowerCase() || "";

    document.querySelectorAll("tbody tr")
        .forEach(linha => {

            linha.style.display =
                linha.innerText
                    .toLowerCase()
                    .includes(termo)
                ? ""
                : "none";
        });
}

function obterDados(){

    const dados = [];

    document.querySelectorAll("#tabelaLicitacoes tr")
        .forEach(tr => {

            if(tr.style.display === "none")
                return;

            const td = tr.querySelectorAll("td");

            if(td.length){

                dados.push({
                    ano: td[0].innerText,
                    ordem: td[1].innerText,
                    numeroModalidade: td[2].innerText,
                    objeto: td[3].innerText,
                    dataSessao: td[4].innerText,
                    valorEstimado: td[5].innerText,
                    valorHomologado: td[6].innerText,
                    situacao: td[7].innerText
                });
            }
        });

    return dados;
}

function baixarArquivo(conteudo, nome, tipo){

    const blob = new Blob([conteudo], {type: tipo});

    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);

    link.download = nome;

    link.click();
}

function exportarCSV(){

    const dados = obterDados();

    if(!dados.length)
        return;

    const colunas = Object.keys(dados[0]);

    const linhas = [
        colunas.join(";"),
        ...dados.map(
            item => colunas.map(
                c => `"${item[c]}"`
            ).join(";")
        )
    ];

    baixarArquivo(
        "\uFEFF" + linhas.join("\n"),
        "licitacoes.csv",
        "text/csv;charset=utf-8;"
    );
}

function exportarJSON(){

    baixarArquivo(
        JSON.stringify(obterDados(), null, 2),
        "licitacoes.json",
        "application/json"
    );
}

function exportarXML(){

    const dados = obterDados();

    let xml =
        `<?xml version="1.0" encoding="UTF-8"?>\n<licitacoes>\n`;

    dados.forEach(item => {

        xml += "<licitacao>\n";

        Object.entries(item).forEach(([k,v]) => {
            xml += `<${k}>${v}</${k}>\n`;
        });

        xml += "</licitacao>\n";
    });

    xml += "</licitacoes>";

    baixarArquivo(
        xml,
        "licitacoes.xml",
        "application/xml"
    );
}

function exportarXLSX(){

    const dados = obterDados();

    const planilha = XLSX.utils.json_to_sheet(dados);

    const pasta = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        pasta,
        planilha,
        "Licitações"
    );

    XLSX.writeFile(
        pasta,
        "licitacoes.xlsx"
    );
}

function exportarPDF(){

    const dados = obterDados();

    const { jsPDF } = window.jspdf;

    const doc = new jsPDF("landscape");

    doc.text("Licitações CIMOP", 14, 15);

    const colunas = Object.keys(dados[0] || {});

    const linhas =
        dados.map(item => colunas.map(c => item[c]));

    doc.autoTable({
        head: [colunas],
        body: linhas,
        startY: 25,
        styles: {
            fontSize: 6
        }
    });

    doc.save("licitacoes.pdf");
}

async function recarregarDados(){
    await carregarDados();
}

preencherData();
carregarDados();
