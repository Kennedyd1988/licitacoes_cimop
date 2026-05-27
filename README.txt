PÁGINA CIMOP - ITENS 8.1 E 8.4

Esta versão foi configurada para tentar alimentar automaticamente os dados pela API de Dados Abertos do TCE/RN, filtrando pelo órgão:
CONSÓRCIO INTERMUNICIPAL MULTIFINALITÁRIO DOS MUNICÍPIOS DO OESTE POTIGUAR.

Arquivos principais:
- index.html
- style.css
- script.js
- dados/licitacoes-cimop-exemplo.json
- dados/documentos-cimop-exemplo.json

IMPORTANTE:
1. A API do TCE/RN pode bloquear consulta direta no navegador por CORS.
2. O Swagger pode usar nomes específicos de endpoints/parâmetros.
3. Se a página abrir sem dados, entre no script.js e preencha:
   CONFIG.ENDPOINT_LICITACOES
   CONFIG.ENDPOINT_DOCUMENTOS
   com os caminhos exatos indicados no Swagger.

Exemplo:
CONFIG.ENDPOINT_LICITACOES = "/api/Licitacoes";
CONFIG.ENDPOINT_DOCUMENTOS = "/api/DocumentosLicitacao";

Depois disso, publique a pasta no GitHub Pages ou no portal institucional.
