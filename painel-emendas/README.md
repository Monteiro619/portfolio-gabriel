# Emenda — Painel de Emendas Parlamentares

Projeto do portfólio de **Gabriel Monteiro Ramos**, voltado à organização e à visualização de informações sobre recursos parlamentares.

**[Abrir demonstração](https://monteiro619.github.io/portfolio-gabriel/painel-emendas/)** · **[Ver portfólio](https://monteiro619.github.io/portfolio-gabriel/)**

## Objetivo

O acompanhamento de emendas exige reunir destinos, valores e etapas de execução em uma visão consistente. Este painel demonstra uma forma de organizar esses dados e facilitar consultas por exercício, município, área de atuação e situação financeira.

## O que você pode testar

- Filtrar 60 registros demonstrativos de 2024 a 2026.
- Consultar valores indicados, empenhados, liquidados e pagos.
- Explorar gráficos de destinação e consolidação por município.
- Buscar, ordenar e paginar os registros.
- Cadastrar e editar emendas, com validação dos valores.
- Importar CSV, exportar o recorte e imprimir um relatório completo.
- Salvar a base no navegador e restaurar a demonstração.

Todos os códigos, beneficiários e valores são fictícios. Os municípios são reais. O projeto não está ligado a sistemas oficiais e não representa uma prestação de contas de um mandato.

## Tecnologias e organização

HTML, CSS e JavaScript, sem dependências de execução ou chaves de API.

| Arquivo | Responsabilidade |
| --- | --- |
| `index.html` | Estrutura, navegação e formulários |
| `style.css` | Identidade visual e layout responsivo |
| `model.js` | Base de exemplo, filtros, cálculos e validação do CSV |
| `app.js` | Interações, gráficos, cadastro e armazenamento local |
| `tests/model.test.cjs` | Testes do modelo de dados |

As fontes web são opcionais; há alternativas locais. Os dados ficam no `localStorage` quando o navegador permite. Não existe compartilhamento da base entre visitantes ou sincronização entre dispositivos.

## Executar localmente

Abra `index.html` em um navegador moderno. Também é possível servir esta pasta com um servidor estático. Não há etapa de instalação ou build.

Para executar os testes, com Node.js instalado:

```bash
node tests/model.test.cjs
```

## Indicadores

Os valores de cada etapa são acumulados e não devem ser somados entre si. A execução financeira usa **pago ÷ indicado** e não mede a execução física nem comprova a entrega do objeto. A situação exibida é uma classificação simplificada a partir dos valores cadastrados.

## Importar uma planilha

O CSV usa UTF-8, ponto e vírgula e o cabeçalho:

```text
id;ano;municipio;uf;area;tipo;beneficiario;objeto;indicado;empenhado;liquidado;pago
```

Use números sem separador de milhar e com ponto decimal. A importação exige **pago ≤ liquidado ≤ empenhado ≤ indicado**, valida a base inteira e pede confirmação antes de substituir os registros locais. Um modelo pode ser baixado na aba Sobre o projeto.

## Escopo da demonstração

O foco está no fluxo de consulta e organização dos dados. Integração com fontes oficiais, autenticação e banco compartilhado são possíveis evoluções e não fazem parte desta versão. Os testes automatizados verificam cálculos, filtros, situações e CSV; a revisão visual em navegador e dispositivos físicos não foi realizada no ambiente de publicação.
