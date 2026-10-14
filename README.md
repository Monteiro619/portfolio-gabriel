# Portfólio de Gabriel Monteiro Ramos

Site estático preparado para GitHub Pages, com layout para desktop, tablet e celular. Não precisa de servidor Node.js, banco de dados, instalação de pacotes ou processo de build para publicar.


## Conteúdo e arquivos

- `index.html`: página pronta, com todas as informações disponíveis mesmo sem JavaScript.
- `assets/styles.css`: estilos gerais.
- `assets/mobile.css`: navegação e adaptações para celular.
- `assets/app.js`: fechamento do menu, cópia de link e geração de QR code.
- `assets/vendor/qrcode.js`: biblioteca local para gerar o QR code, sem chamadas a serviços externos.
- `assets/docs/curriculo-oficial.docx`: cópia idêntica ao currículo oficial anexado.
- `assets/docs/curriculo-oficial.pdf`: PDF exportado do documento oficial.
- `assets/profile.json`: dados extraídos do currículo oficial.
- `gerar-site.py`: script opcional para regenerar o HTML depois de editar o JSON. Usa apenas a biblioteca padrão do Python.
- `THIRD_PARTY_NOTICES.md`: avisos e licença da biblioteca de QR code.

## Informações usadas

O currículo oficial é a fonte principal para formação, cargos, períodos, atividades, competências e cursos. A formação foi incorporada com Arquivologia em 2022, Análise e Desenvolvimento de Sistemas em 2025 e pós-graduação em Análise de Dados em 2024. Os cargos de cofundador da ArquiTI e da ARCH foram preservados. As experiências complementares não mostram períodos.

Os três projetos profissionais são Exames Médicos Periódicos em Power BI, Câmara 360 e Assistente Virtual SAA. Os links e detalhes técnicos complementares vieram das informações e repositórios apresentados na conversa. Não foram incluídos RPG, Guaraná, Pokédex ou Game Snake.

O Word foi copiado sem alterar os bytes do arquivo original. O PDF foi exportado para facilitar a leitura pelo celular; a exportação tem três páginas. Não foi criada outra versão de conteúdo do currículo.

## Celular

- Menu compacto com áreas clicáveis de pelo menos 44 px.
- Botões de currículo e contato fixos no rodapé em telas menores.
- Cards, experiências e formação passam para uma coluna.
- Layout preparado para telas a partir de 320 px, com campos e links longos adaptados.
- PDF e Power BI abrem por links, em vez de iframes fixos que dificultam o uso no celular.
- Fontes do sistema e biblioteca de QR code incluída no pacote, sem dependência de CDN.
- Navegação básica e conteúdo continuam disponíveis sem JavaScript.
- Foco visível, navegação por teclado e respeito à preferência de movimento reduzido.

Os dados, caminhos, links internos, sintaxe JavaScript e funções do menu e QR code foram verificados. A revisão visual em navegador e aparelhos físicos não foi realizada neste ambiente. Após publicar, confira em um celular a leitura, o menu, os botões, o PDF e o relatório do Power BI.

## QR code do currículo

O currículo oficial anexado ainda contém o endereço `https://gabriel-monteiro-portfolio.sei4-0.chatgpt.site`. Esse endereço foi preservado no documento porque ele foi declarado final e oficial.

Depois da publicação no GitHub Pages:

1. Abra o portfólio publicado.
2. Vá a **Currículo → Gerar QR code deste portfólio**.
3. Confira o endereço definitivo do site, que será preenchido automaticamente quando possível.
4. Clique em **Gerar QR code** e **Baixar QR code**.
5. Quando decidir atualizar o currículo, substitua o QR code e o endereço escrito pela nova versão. Teste com a câmera de um celular antes de enviar.

Não use um QR code com o caminho de um arquivo local ou com um endereço de prévia. O campo de geração aceita URLs HTTPS e não envia os dados a nenhum serviço externo.

## Alterar informações no futuro

Edite `assets/profile.json` e execute, dentro da pasta do projeto:

```bash
python gerar-site.py
```

Isso atualiza `index.html`. Envie o JSON e o HTML atualizado ao GitHub. Não é necessário executar o script no GitHub Pages.

Os textos e links dos projetos ficam no script `gerar-site.py`. Os estilos podem ser editados diretamente nos arquivos CSS. Para atualizar o currículo disponível para download, substitua os arquivos em `assets/docs` mantendo os nomes.

## Painel de Emendas Parlamentares

Demonstração interativa com filtros, indicadores financeiros, cadastro, edição e CSV. Todos os valores e registros são fictícios.

- [Testar o painel](https://monteiro619.github.io/portfolio-gabriel/painel-emendas/)
- [Código e documentação](painel-emendas/README.md)

## Radar Legislativo

Pesquisa de proposições com a API oficial da Câmara dos Deputados, lista pessoal e comparação manual de tramitações. Layout para computador e celular.

- [Testar o radar](https://monteiro619.github.io/portfolio-gabriel/radar-legislativo/)
- [Código e documentação](radar-legislativo/README.md)
