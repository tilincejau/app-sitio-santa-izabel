# App Sítio Santa Izabel

Substitui o AppSheet. Front em HTML/CSS/JS (GitHub Pages) + backend em Google Apps Script gravando na sua planilha e disparando os laudos Word que você já tem.

```
index.html  style.css  script.js        <- vão para o GitHub
backend/Code.gs  backend/appsscript.json <- vão para o Apps Script
```

## Instalação (uma vez)

1. **Pastas no Drive.** Crie duas: `Assinaturas` e `Notas fiscais`. Copie o ID de cada uma (o trecho final da URL da pasta) e cole em `CFG.PASTA_ASSINATURAS` e `CFG.PASTA_NOTAS`, no topo do `Code.gs`.
2. **Planilha.** Crie a aba `Usuarios` com as colunas `usuario` e `senha`, uma linha por pessoa.
3. **Apps Script.** Em script.google.com, crie um projeto novo.
   - Cole o `Code.gs`.
   - Em Configurações do projeto, marque "Mostrar arquivo de manifesto" e cole o `appsscript.json` (fuso horário de São Paulo).
   - Para cada script de laudo que você já tem, crie um arquivo `.gs` neste mesmo projeto e cole o código: `processarNovaAplicacao`, `gerarLaudoHidrometro`, `gerarLaudoIrrigacao`, `gerarLaudoPluviometro`, `gerarLaudoEPI_Word`, `gerarLaudoAbastecimento`, `gerarLaudoDiesel`, `gerarLaudoLimpezaLocal` e `gerarLaudoLimpeza`.
4. **Publicar o backend.** Implantar > Nova implantação > App da Web. Executar como: **eu**. Quem tem acesso: **qualquer pessoa**. Autorize as permissões e copie a URL que termina em `/exec`.
5. **Front.** Cole essa URL em `API_URL`, no topo do `script.js`. Suba os 3 arquivos no repositório e ative Settings > Pages > Deploy from branch > main.

## Ajustes nos scripts de laudo

- **ID da planilha.** Os scripts usam `1lL213rPblnFWejbgvBQAr6WM6do6TfR9kHJFStglBOY` e o backend usa `1hVGUdFfvP-SBlj0XWaJnSsKChrrjoJLzicCo068roC8`. Os dois precisam apontar para a mesma planilha.
- **processarNovaAplicacao.** Aceite o ID da aplicação, para gerar o laudo da aplicação certa mesmo se duas forem lançadas seguidas.
  - Troque a primeira linha da função por `function processarNovaAplicacao(idAplicacaoOpcional) {`.
  - Logo depois de `var ultimaLinhaApp = dadosApp[dadosApp.length - 1];`, acrescente:
    ```js
    if (idAplicacaoOpcional) {
      for (var q = dadosApp.length - 1; q > 0; q--) {
        if (dadosApp[q][0].toString().trim() === idAplicacaoOpcional) { ultimaLinhaApp = dadosApp[q]; break; }
      }
    }
    ```
  - Troque `ss.getSheetByName("Cadastro_Produtos")` por `(ss.getSheetByName("Cadastro_Produtos") || ss.getSheetByName("cadastro_produtos"))`. Sem isso, o laudo sai com o código do produto em vez do nome.
- **gerarLaudoLimpezaLocal.** O script procura colunas chamadas "Carreadores", "Lixeiras", "Banheiro químico"… e a aba tem cabeçalhos como "CARREADORES, ÁREA DE CARREGAMENTO…" e "BANHEIRO". Ou ajuste a lista `colunasAreas` do script para os cabeçalhos reais, ou renomeie os cabeçalhos da aba.

## Como funciona

- Cada lançamento é guardado no celular e enviado quando houver sinal. O envio é seguro contra repetição (cada um tem um ID).
- O backend grava na aba certa e agenda o laudo para rodar em segundo plano, então o celular não fica esperando o Word. Falhas ficam na aba `_erros`.
- Assinaturas são salvas na pasta do Drive com o mesmo padrão de nome do AppSheet, então os scripts de laudo as encontram.
- Valores digitados em "Outro" na máquina ficam salvos na aba `Listas` (criada automaticamente) para a próxima vez.
- Cálculos (consumo e média do hidrômetro, horas de irrigação, média L/h, conjunto e nº da lavagem) são refeitos no backend, na hora de gravar.

## Estoque

- **Saldo** = última contagem + entradas − o que foi usado nas aplicações desde a contagem.
- **Chegou produto:** o trabalhador escolhe o produto, a quantidade e a unidade, e tira foto da nota. Sem a foto, a entrada fica "SEM NOTA" e a foto é anexada depois pelo app. Produto novo vai para `cadastro_produtos` e já aparece na lista da pulverização e da adubação.
- A aba `entradas_estoque` é criada automaticamente. A coluna STATUS mostra o que o escritório ainda precisa conferir.
- **Leitura automática da nota (próxima etapa):** o app já guarda a foto. Para preencher produto e quantidade sozinho, é preciso conectar um serviço de leitura de imagem com uma chave de API.

## Separar cada tópico em uma planilha própria

Hoje cada tópico tem sua aba. Para usar uma planilha por tópico, preencha `PLANILHAS` no `Code.gs`, por exemplo `{ hidrometro: 'ID_DA_OUTRA_PLANILHA' }`. Os scripts de laudo também precisam apontar para o novo ID.
