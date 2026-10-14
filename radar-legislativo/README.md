# Radar Legislativo

Projeto do portfólio de **Gabriel Monteiro Ramos** para pesquisa de proposições e acompanhamento de tramitações da Câmara dos Deputados.

**[Abrir Radar Legislativo](https://monteiro619.github.io/portfolio-gabriel/radar-legislativo/)** · **[Ver portfólio](https://monteiro619.github.io/portfolio-gabriel/)**

## Dados concretos da Câmara

A fonte principal é a **API oficial de Dados Abertos da Câmara dos Deputados**. A aplicação consulta a API ao abrir e em cada pesquisa. Não há projetos de lei, ementas, autores ou tramitações fictícios.

Busca por palavra-chave da indexação oficial, ano de apresentação, tipo, número e autor. A listagem é paginada e ordenada por ID decrescente; a ordem do ID não indica a data da última tramitação. Os indicadores e o CSV da busca ao vivo referem-se à página exibida, não ao total de proposições da Câmara.

## Funcionalidades

- Consulta ao vivo e acesso à ficha oficial e ao inteiro teor, quando disponível.
- Detalhes de autoria, temas, situação, regime e histórico de tramitação.
- Lista pessoal com prioridades e anotações.
- Verificação manual de mudanças na situação e nas tramitações da lista.
- Histórico de diferenças detectadas e marcação como lidas.
- Exportação de resultados em CSV, backup JSON e relatório para impressão.
- Layout para computador, tablet e celular, com controles adaptados ao toque.

## Acompanhamento

Ao acompanhar uma matéria, a consulta cria a referência inicial. “Verificar minha lista” busca novamente detalhes e tramitações na API, compara com a referência anterior e registra diferenças. Uma correção de um registro da fonte também pode aparecer como diferença; o indicador não implica necessariamente uma nova atividade legislativa.

Não há monitoramento em segundo plano nem notificações por email. As verificações são solicitadas na interface. Falhas de consulta preservam a base anterior da matéria.

A lista, as anotações e as diferenças ficam no navegador por meio de `localStorage`, quando disponível. Cada visitante tem seu próprio espaço, sem banco compartilhado ou autenticação. O backup permite transferir a lista entre dispositivos e exige confirmação para substituir a lista atual.

## Disponibilidade da fonte

Quando a API falha, a interface informa o erro e oferece uma **cópia local de dados oficiais coletados**. Essa opção exige escolha explícita; os resultados locais não são apresentados como consulta atualizada.

A cópia em `snapshot.js` contém 40 proposições reais coletadas da API, incluindo PL, PEC e PLP de 2025 e 2026. A data de coleta aparece na interface. É um recorte limitado e não se atualiza automaticamente. A busca local considera ementa e palavras-chave; a busca na API usa os critérios de indexação da Câmara e pode trazer resultados diferentes.

Para atualizar a cópia com Python 3:

```bash
python scripts/atualizar_base.py
```

O script usa somente a biblioteca padrão, grava a data de coleta e preserva a base anterior se não houver nenhuma coleta válida. Eventuais falhas parciais ficam registradas no arquivo.

## Executar

Sirva a pasta com um servidor estático. Por exemplo, com Python instalado:

```bash
python -m http.server 8000
```

Acesse `http://localhost:8000`. A publicação no GitHub Pages serve os arquivos diretamente, sem build, dependências ou chaves de API. Fontes externas têm alternativas locais.

## Estrutura

| Arquivo | Função |
| --- | --- |
| `index.html` | Estrutura, formulários, navegação e detalhes |
| `style.css` | Identidade visual e adaptação para diferentes telas |
| `app.js` | Consultas, interações, armazenamento e acompanhamento |
| `model.js` | Normalização, filtros, comparação e validação de backup |
| `snapshot.js` | Recorte real com origem e data da coleta |
| `scripts/atualizar_base.py` | Atualização reproduzível do recorte |
| `tests/model.test.cjs` | Testes da camada de dados |

Com Node.js instalado, execute `node tests/model.test.cjs`. Os testes verificam os dados coletados, filtros, construção das consultas, comparação, segurança de links e backup. Os endpoints reais foram consultados na preparação. A revisão visual em navegador e aparelhos físicos não foi realizada no ambiente de publicação.

## Fontes e escopo

- [API e documentação oficial](https://dadosabertos.camara.leg.br/swagger/api.html)
- `/proposicoes`, `/proposicoes/{id}`, `/proposicoes/{id}/autores`, `/proposicoes/{id}/temas` e `/proposicoes/{id}/tramitacoes`.

Este é um projeto pessoal de portfólio, sem vínculo institucional como serviço oficial da Câmara. Campos ausentes são identificados; não se infere urgência, aprovação ou posicionamento político a partir da ementa. O histórico e os documentos devem ser conferidos na fonte oficial.
