let dadosLicitacoes = [];
let dadosDispensas = [];
let dadosFiltrados = [];

let paginaAtual = 1;

const itensPorPagina = 10;

/* =====================================================
   CARREGAMENTO DOS ARQUIVOS JSON
===================================================== */

async function carregarJSON(caminho) {
  try {
    const resposta = await fetch(caminho);

    if (!resposta.ok) {
      throw new Error(`Erro ao carregar ${caminho}`);
    }

    return await resposta.json();
  } catch (erro) {
    console.error(erro);
    return [];
  }
}

/* =====================================================
   FUNÇÕES AUXILIARES
===================================================== */

function normalizarTexto(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function statusClasse(status) {
  if (!status) {
    return "status-encerrado";
  }

  const situacao = normalizarTexto(status);

  const statusAtivo =
    situacao.includes("homolog") ||
    situacao.includes("public") ||
    situacao.includes("abert") ||
    situacao.includes("andamento") ||
    situacao.includes("formal");

  return statusAtivo
    ? "status-vigente"
    : "status-encerrado";
}

function linksDocs(documentos) {
  if (!documentos || !documentos.length) {
    return "Não anexado";
  }

  return `
    <div class="docs-lista">
      ${documentos
        .map((documento, indice) => `
          <a
            href="${documento.url}"
            target="_blank"
            rel="noopener noreferrer"
            class="${indice === 0 ? "botao" : "botao-secundario"}"
          >
            ${documento.nome || `Documento ${indice + 1}`}
          </a>
        `)
        .join("")}
    </div>
  `;
}

function objetoCelula(texto) {
  const conteudo = texto || "";

  const precisaVerMais =
    conteudo.length > 260;

  const id =
    "obj_" +
    Math.random()
      .toString(36)
      .substring(2, 10);

  const titulo = String(conteudo)
    .replace(/"/g, "&quot;");

  return `
    <div
      id="${id}"
      class="objeto-resumido"
      title="${titulo}"
    >
      ${conteudo}
    </div>

    ${
      precisaVerMais
        ? `
          <span
            class="botao-ver-mais"
            onclick="alternarObjeto('${id}', this)"
          >
            Ver mais
          </span>
        `
        : ""
    }
  `;
}

function alternarObjeto(id, botao) {
  const elemento =
    document.getElementById(id);

  if (!elemento) {
    return;
  }

  elemento.classList.toggle("expandido");

  botao.innerText =
    elemento.classList.contains("expandido")
      ? "Ver menos"
      : "Ver mais";
}

function preencherData() {
  const elemento =
    document.getElementById("dataHoje");

  if (!elemento) {
    return;
  }

  const data = new Date();

  data.setDate(data.getDate() - 20);

  elemento.textContent =
    data.toLocaleDateString("pt-BR");
}

/* =====================================================
   PREENCHIMENTO DAS OPÇÕES DOS FILTROS DE LICITAÇÕES
===================================================== */

function preencherOpcoesFiltrosLicitacoes() {
  const filtroAno =
    document.getElementById("filtroAno");

  const filtroSituacao =
    document.getElementById("filtroSituacao");

  if (filtroAno) {
    const anos = [
      ...new Set(
        dadosLicitacoes
          .map(item => item.ano)
          .filter(valor =>
            valor !== undefined &&
            valor !== null &&
            valor !== ""
          )
      )
    ].sort((a, b) =>
      Number(b) - Number(a)
    );

    filtroAno.innerHTML =
      '<option value="">Todos os anos</option>' +
      anos
        .map(ano => `
          <option value="${ano}">
            ${ano}
          </option>
        `)
        .join("");
  }

  if (filtroSituacao) {
    const situacoes = [
      ...new Set(
        dadosLicitacoes
          .map(item => item.situacao)
          .filter(valor =>
            valor !== undefined &&
            valor !== null &&
            valor !== ""
          )
      )
    ].sort((a, b) =>
      String(a).localeCompare(
        String(b),
        "pt-BR"
      )
    );

    filtroSituacao.innerHTML =
      '<option value="">Todas as situações</option>' +
      situacoes
        .map(situacao => `
          <option value="${situacao}">
            ${situacao}
          </option>
        `)
        .join("");
  }
}

/* =====================================================
   FILTROS ESPECÍFICOS DAS LICITAÇÕES
===================================================== */

function aplicarFiltrosLicitacoes() {
  const ano =
    document.getElementById("filtroAno")
      ?.value || "";

  const numeroModalidade = normalizarTexto(
    document.getElementById("filtroNumero")
      ?.value
  );

  const objeto = normalizarTexto(
    document.getElementById("filtroObjeto")
      ?.value
  );

  const dataAbertura = normalizarTexto(
    document.getElementById("filtroDataAbertura")
      ?.value
  );

  const valor = normalizarTexto(
    document.getElementById("filtroValor")
      ?.value
  );

  const situacao = normalizarTexto(
    document.getElementById("filtroSituacao")
      ?.value
  );

  dadosFiltrados = dadosLicitacoes.filter(
    item => {
      const correspondeAno =
        !ano ||
        String(item.ano) === String(ano);

      const correspondeNumero =
        !numeroModalidade ||
        normalizarTexto(
          item.numeroModalidade
        ).includes(numeroModalidade);

      const correspondeObjeto =
        !objeto ||
        normalizarTexto(
          item.objeto
        ).includes(objeto);

      const correspondeData =
        !dataAbertura ||
        normalizarTexto(
          item.dataAbertura
        ).includes(dataAbertura);

      const correspondeValor =
        !valor ||
        normalizarTexto(
          item.valorEstimadoHomologado
        ).includes(valor);

      const correspondeSituacao =
        !situacao ||
        normalizarTexto(
          item.situacao
        ) === situacao;

      return (
        correspondeAno &&
        correspondeNumero &&
        correspondeObjeto &&
        correspondeData &&
        correspondeValor &&
        correspondeSituacao
      );
    }
  );

  paginaAtual = 1;

  renderizarTabelaAtual();
  atualizarResultadoFiltro();
}

function limparFiltrosLicitacoes() {
  const campos = [
    "filtroAno",
    "filtroNumero",
    "filtroObjeto",
    "filtroDataAbertura",
    "filtroValor",
    "filtroSituacao"
  ];

  campos.forEach(id => {
    const elemento =
      document.getElementById(id);

    if (elemento) {
      elemento.value = "";
    }
  });

  aplicarFiltrosLicitacoes();
}

function atualizarResultadoFiltro() {
  const elemento =
    document.getElementById("resultadoFiltro");

  if (!elemento) {
    return;
  }

  const total =
    window.tipoPagina === "licitacoes"
      ? dadosLicitacoes.length
      : dadosDispensas.length;

  const quantidade =
    dadosFiltrados.length;

  if (total === 0) {
    elemento.textContent =
      "Nenhum registro disponível para consulta.";

    return;
  }

  if (quantidade === total) {
    elemento.textContent =
      `Exibindo todos os ${total} registros disponíveis.`;

    return;
  }

  if (quantidade === 0) {
    elemento.textContent =
      `Nenhum registro localizado entre os ${total} registros disponíveis.`;

    return;
  }

  if (quantidade === 1) {
    elemento.textContent =
      `1 registro localizado entre os ${total} registros disponíveis.`;

    return;
  }

  elemento.textContent =
    `${quantidade} registros localizados entre os ${total} registros disponíveis.`;
}

/* =====================================================
   BUSCA SIMPLES PARA DISPENSAS
===================================================== */

function aplicarFiltroDispensas(dados) {
  const termo = normalizarTexto(
    document.getElementById("campoBusca")
      ?.value
  );

  if (!termo) {
    return dados;
  }

  return dados.filter(item =>
    normalizarTexto(
      JSON.stringify(item)
    ).includes(termo)
  );
}

function filtrarTabelas() {
  paginaAtual = 1;

  if (window.tipoPagina === "licitacoes") {
    aplicarFiltrosLicitacoes();
    return;
  }

  if (window.tipoPagina === "dispensas") {
    dadosFiltrados =
      aplicarFiltroDispensas(
        dadosDispensas
      );

    renderizarTabelaAtual();
  }
}

/* =====================================================
   PAGINAÇÃO
===================================================== */

function atualizarPaginacao() {
  const informacao =
    document.getElementById("infoPagina");

  const anterior =
    document.getElementById("btnAnterior");

  const proxima =
    document.getElementById("btnProxima");

  if (!informacao) {
    return;
  }

  const totalPaginas = Math.max(
    1,
    Math.ceil(
      dadosFiltrados.length /
      itensPorPagina
    )
  );

  if (paginaAtual > totalPaginas) {
    paginaAtual = totalPaginas;
  }

  informacao.innerText =
    `Página ${paginaAtual} de ${totalPaginas} — ${dadosFiltrados.length} registro(s)`;

  if (anterior) {
    anterior.disabled =
      paginaAtual <= 1;
  }

  if (proxima) {
    proxima.disabled =
      paginaAtual >= totalPaginas;
  }
}

function paginaAnterior() {
  if (paginaAtual > 1) {
    paginaAtual--;

    renderizarTabelaAtual();
  }
}

function proximaPagina() {
  const totalPaginas = Math.max(
    1,
    Math.ceil(
      dadosFiltrados.length /
      itensPorPagina
    )
  );

  if (paginaAtual < totalPaginas) {
    paginaAtual++;

    renderizarTabelaAtual();
  }
}

function fatiaPagina() {
  const inicio =
    (paginaAtual - 1) *
    itensPorPagina;

  return dadosFiltrados.slice(
    inicio,
    inicio + itensPorPagina
  );
}

/* =====================================================
   RENDERIZAÇÃO DAS TABELAS
===================================================== */

function renderizarTabelaAtual() {
  if (window.tipoPagina === "licitacoes") {
    renderizarLicitacoes();
  }

  if (window.tipoPagina === "dispensas") {
    renderizarDispensas();
  }

  atualizarPaginacao();
}

function renderizarLicitacoes() {
  const tabela =
    document.getElementById(
      "tabelaLicitacoes"
    );

  if (!tabela) {
    return;
  }

  if (!dadosFiltrados.length) {
    tabela.innerHTML = `
      <tr>
        <td
          colspan="7"
          class="linha-vazia"
        >
          Nenhum registro localizado para os parâmetros informados.
        </td>
      </tr>
    `;

    return;
  }

  tabela.innerHTML = fatiaPagina()
    .map(item => `
      <tr>
        <td>
          ${item.ano ?? "-"}
        </td>

        <td>
          ${item.numeroModalidade ?? "-"}
        </td>

        <td>
          ${objetoCelula(item.objeto)}
        </td>

        <td>
          ${item.dataAbertura ?? "-"}
        </td>

        <td>
          ${item.valorEstimadoHomologado ?? "-"}
        </td>

        <td>
          <span
            class="status ${statusClasse(item.situacao)}"
          >
            ${item.situacao ?? "-"}
          </span>
        </td>

        <td>
          ${linksDocs(item.documentos)}
        </td>
      </tr>
    `)
    .join("");
}

function renderizarDispensas() {
  const tabela =
    document.getElementById(
      "tabelaDispensas"
    );

  if (!tabela) {
    return;
  }

  if (!dadosFiltrados.length) {
    tabela.innerHTML = `
      <tr>
        <td
          colspan="9"
          class="linha-vazia"
        >
          Nenhum registro localizado.
        </td>
      </tr>
    `;

    return;
  }

  tabela.innerHTML = fatiaPagina()
    .map(item => `
      <tr>
        <td>
          ${item.ano ?? "-"}
        </td>

        <td>
          ${item.numeroProcesso ?? "-"}
        </td>

        <td>
          ${item.numeroModalidade ?? "-"}
        </td>

        <td>
          ${objetoCelula(item.objeto)}
        </td>

        <td>
          ${item.data ?? "-"}
        </td>

        <td>
          ${item.valorContratado ?? "-"}
        </td>

        <td>
          ${item.credorCpfCnpj ?? "-"}
        </td>

        <td>
          <span
            class="status ${statusClasse(item.situacao)}"
          >
            ${item.situacao ?? "-"}
          </span>
        </td>

        <td>
          ${linksDocs(item.documentos)}
        </td>
      </tr>
    `)
    .join("");
}

/* =====================================================
   INICIALIZAÇÃO
===================================================== */

async function iniciarPagina() {
  preencherData();

  if (window.tipoPagina === "licitacoes") {
    dadosLicitacoes =
      await carregarJSON(
        "dados/licitacoes.json"
      );

    dadosFiltrados =
      dadosLicitacoes;

    preencherOpcoesFiltrosLicitacoes();

    renderizarTabelaAtual();
    atualizarResultadoFiltro();
  }

  if (window.tipoPagina === "dispensas") {
    dadosDispensas =
      await carregarJSON(
        "dados/dispensas-inexigibilidades.json"
      );

    dadosFiltrados =
      dadosDispensas;

    renderizarTabelaAtual();
  }
}

/* =====================================================
   DADOS PARA EXPORTAÇÃO
===================================================== */

function obterDadosDasTabelas() {
  if (window.tipoPagina === "licitacoes") {
    return dadosFiltrados.map(item => ({
      "Ano":
        item.ano,

      "Número / Modalidade":
        item.numeroModalidade,

      "Objeto":
        item.objeto,

      "Data da sessão de abertura":
        item.dataAbertura,

      "Valor estimado / homologado":
        item.valorEstimadoHomologado,

      "Situação":
        item.situacao,

      "Documentos":
        (item.documentos || [])
          .map(documento => documento.url)
          .join(" | ")
    }));
  }

  if (window.tipoPagina === "dispensas") {
    return dadosFiltrados.map(item => ({
      "Ano":
        item.ano,

      "Processo":
        item.numeroProcesso,

      "Número / Modalidade":
        item.numeroModalidade,

      "Objeto":
        item.objeto,

      "Data":
        item.data,

      "Valor contratado":
        item.valorContratado,

      "CPF/CNPJ credor":
        item.credorCpfCnpj,

      "Situação":
        item.situacao,

      "Documentos principais":
        (item.documentos || [])
          .map(documento => documento.url)
          .join(" | ")
    }));
  }

  return [];
}

/* =====================================================
   EXPORTAÇÕES
===================================================== */

function baixarArquivo(
  conteudo,
  nomeArquivo,
  tipo
) {
  const blob =
    new Blob(
      [conteudo],
      { type: tipo }
    );

  const link =
    document.createElement("a");

  const url =
    URL.createObjectURL(blob);

  link.href = url;
  link.download = nomeArquivo;

  document.body.appendChild(link);

  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function nomeBase() {
  return document.title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function exportarCSV() {
  const dados =
    obterDadosDasTabelas();

  if (!dados.length) {
    alert(
      "Nenhum dado disponível para exportação."
    );

    return;
  }

  const colunas =
    Object.keys(dados[0]);

  const linhas = [
    colunas.join(";"),

    ...dados.map(item =>
      colunas
        .map(coluna => {
          const valor = String(
            item[coluna] ?? ""
          ).replace(/"/g, '""');

          return `"${valor}"`;
        })
        .join(";")
    )
  ];

  baixarArquivo(
    "\uFEFF" + linhas.join("\n"),
    nomeBase() + ".csv",
    "text/csv;charset=utf-8;"
  );
}

function exportarJSON() {
  const dados =
    obterDadosDasTabelas();

  if (!dados.length) {
    alert(
      "Nenhum dado disponível para exportação."
    );

    return;
  }

  baixarArquivo(
    JSON.stringify(dados, null, 2),
    nomeBase() + ".json",
    "application/json;charset=utf-8;"
  );
}

function exportarXML() {
  const dados =
    obterDadosDasTabelas();

  if (!dados.length) {
    alert(
      "Nenhum dado disponível para exportação."
    );

    return;
  }

  let xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n<registros>\n';

  dados.forEach(item => {
    xml += "  <registro>\n";

    Object.entries(item).forEach(
      ([chave, valor]) => {
        const tag = chave
          .normalize("NFD")
          .replace(
            /[\u0300-\u036f]/g,
            ""
          )
          .replace(
            /[^a-zA-Z0-9]/g,
            "_"
          )
          .toLowerCase();

        const conteudo =
          String(valor)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        xml +=
          `    <${tag}>${conteudo}</${tag}>\n`;
      }
    );

    xml += "  </registro>\n";
  });

  xml += "</registros>";

  baixarArquivo(
    xml,
    nomeBase() + ".xml",
    "application/xml;charset=utf-8;"
  );
}

function exportarXLSX() {
  const dados =
    obterDadosDasTabelas();

  if (!dados.length) {
    alert(
      "Nenhum dado disponível para exportação."
    );

    return;
  }

  const planilha =
    XLSX.utils.json_to_sheet(dados);

  const pasta =
    XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    pasta,
    planilha,
    "Dados"
  );

  XLSX.writeFile(
    pasta,
    nomeBase() + ".xlsx"
  );
}

function exportarPDF() {
  const dados =
    obterDadosDasTabelas();

  const { jsPDF } =
    window.jspdf;

  const documento =
    new jsPDF("landscape");

  documento.setFontSize(14);

  documento.text(
    document.title,
    14,
    15
  );

  if (!dados.length) {
    documento.text(
      "Nenhum dado disponível para exportação.",
      14,
      30
    );

    documento.save(
      nomeBase() + ".pdf"
    );

    return;
  }

  const colunas =
    Object.keys(dados[0]);

  const linhas =
    dados.map(item =>
      colunas.map(coluna =>
        item[coluna]
      )
    );

  documento.autoTable({
    head: [colunas],
    body: linhas,
    startY: 25,
    styles: {
      fontSize: 7,
      cellPadding: 2
    },
    headStyles: {
      fillColor: [7, 55, 99]
    }
  });

  documento.save(
    nomeBase() + ".pdf"
  );
}

iniciarPagina();
