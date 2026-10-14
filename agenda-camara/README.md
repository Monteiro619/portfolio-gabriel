# Agenda da Câmara

Projeto do portfólio de **Gabriel Monteiro Ramos**: uma interface para explorar eventos da Câmara dos Deputados, consultar pautas e organizar uma agenda pessoal.

**[Abrir Agenda da Câmara](https://monteiro619.github.io/portfolio-gabriel/agenda-camara/)** · **[Ver portfólio](https://monteiro619.github.io/portfolio-gabriel/)**

## Funcionalidades

- Consulta à API oficial ao abrir e ao mudar o período.
- Recortes de hoje, semana, mês ou intervalo personalizado.
- Separação entre comissões, Plenário e outros órgãos.
- Filtros por órgão específico, tipo, situação e assunto.
- Lista agrupada por dia, calendário mensal e seleção de datas.
- Detalhes do evento, pauta, ficha oficial e registro ou vídeo quando fornecido pela fonte.
- Agenda pessoal com anotações, verificação manual de mudanças e indicação de possíveis conflitos.
- Exportação CSV e arquivo de calendário .ics, impressão e backup JSON.
- Interface adaptada para computador, tablet e celular, com identidade em azul-violeta e coral.

## Dados oficiais

Fonte: [API de Dados Abertos da Câmara](https://dadosabertos.camara.leg.br/swagger/api.html).

Endpoints: `/eventos`, `/eventos/{id}`, `/eventos/{id}/pauta`, `/orgaos` e referências de tipos e situações de eventos.

A aplicação carrega páginas do período para filtrar localmente. Aceita intervalos de até 93 dias e coleta até 10 páginas de 100 eventos. Uma consulta incompleta é identificada na interface; os números se referem ao recorte carregado, não ao total da Câmara. Os eventos são ordenados localmente por início e ID, sem depender da ordem de retorno da API.

Comissões são identificadas pelo tipo de órgão informado na fonte, com exceção da Mesa. Plenário usa a sigla oficial PLEN ou o tipo Plenário Virtual CD; Outros inclui os demais responsáveis. Um evento conjunto pode pertencer a mais de uma categoria. Local chamado “Plenário 13” não classifica uma reunião de comissão como sessão do Plenário da Câmara.

A lista de órgãos combina comissões permanentes do catálogo e responsáveis pelos eventos do intervalo. Não se afirma que esse catálogo contenha todas as comissões históricas ou temporárias sem eventos no recorte. A API pode listar atividades do Congresso ou de outros órgãos; seus nomes são preservados.

## Horários, pauta e disponibilidade

Horários são exibidos como fornecidos pela fonte, em Brasília. Fim, local, vídeos e itens de pauta não são inventados quando ausentes. Falha de consulta à pauta é diferenciada de uma resposta válida sem itens. Situações canceladas e encerradas continuam visíveis.

Quando a API falha, o visitante pode escolher uma cópia oficial do mês em `snapshot.js`, com origem e data de coleta visíveis. A opção é explícita e não é apresentada como consulta atualizada. Não há eventos fictícios.

## Minha agenda

Cada visitante tem sua lista no navegador por meio de `localStorage`, quando disponível. O backup JSON permite transferi-la; restaurar exige confirmação antes de substituir os dados locais.

“Verificar atualizações” consulta os eventos salvos e informa quantos apresentam diferenças. Não há monitoramento em segundo plano, lembretes automáticos ou sincronização entre usuários. Erros preservam os dados anteriores.

Possíveis conflitos são sinalizados se os inícios coincidem ou se ambos os eventos têm início e fim informados e os intervalos se sobrepõem. Eventos cancelados são excluídos desse cálculo. A aplicação não estima duração quando o fim está ausente.

O .ics pode ser importado em aplicativos de calendário. Usa o fuso America/Sao_Paulo e o início informado. O fim é omitido quando ausente. É uma exportação pontual e não se atualiza automaticamente quando a Câmara altera um evento.

## Executar e verificar

Sirva a pasta com um servidor estático, por exemplo:

```bash
python -m http.server 8000
```

Abra `http://localhost:8000`. Não há etapa de instalação ou build. A API é consultada diretamente do navegador. Fontes externas têm alternativas locais.

Com Node.js, execute:

```bash
node tests/model.test.cjs
```

Os testes verificam dados coletados, datas, filtros, categorias, backup, sobreposições, pauta e exportação ICS/CSV. Os endpoints reais foram consultados na preparação. A revisão visual em navegador e dispositivos físicos não foi realizada no ambiente de publicação.

Para atualizar a cópia oficial do mês, com Python 3 e dados de fuso horário disponíveis:

```bash
python scripts/atualizar_base.py
```

## Organização

| Arquivo | Responsabilidade |
| --- | --- |
| `index.html` | Navegação, filtros, calendário, agenda pessoal e detalhes |
| `style.css` | Identidade visual, estados e adaptação de telas |
| `app.js` | Consultas à API e interações |
| `model.js` | Normalização, datas, categorias, exportação e validação |
| `snapshot.js` | Cópia de dados reais e referências oficiais |
| `scripts/atualizar_base.py` | Coleta reproduzível da agenda do mês |
| `tests/model.test.cjs` | Testes da camada de dados |

Projeto pessoal de portfólio, sem vínculo como serviço oficial da Câmara. Confira as condições e eventuais alterações de programação na ficha oficial.
