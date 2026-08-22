<div align="center">
  <img src="./docs/assets/lambdo.png" width="280" alt="Lambdo" />
  <p><strong>Um simulador de ondas que cabe no terminal.</strong></p>
  <p><a href="./README.md">Read in English</a></p>
</div>

<p align="center">
  <img src="./docs/assets/lambdo-wave-line.svg" width="720" alt="Uma onda animada desenhada com caracteres do terminal" />
</p>

O Lambdo nasceu de uma anotação da minha apostila de física. Eu tinha escrito `v = λf` ao lado de alguns desenhos de onda e fiquei pensando em como seria mudar cada valor e ver o desenho responder na hora.

Fiz o projeto para juntar física e programação em um experimento que pudesse ser alterado em tempo real. Ele ainda é um laboratório pequeno, mas todas as ondas são calculadas de verdade. A interface não reproduz um GIF pronto.

## O que acontece quando um valor muda

A amplitude `A` controla a altura da onda. O comprimento `λ` controla o espaço de um ciclo. A frequência `f` informa quantos ciclos acontecem por segundo. A fase `φ` desloca a oscilação.

Esses valores entram na expressão:

```text
y(x,t) = A sen(kx - ωt + φ)
```

O programa também calcula:

```text
v = λf
k = 2π/λ
ω = 2πf
T = 1/f
```

No modo de interferência, duas ondas são somadas ponto por ponto. Se elas estão em fase, duas amplitudes iguais a 1 produzem amplitude resultante 2. Se a diferença de fase é `π`, uma cancela a outra e o resultado chega a 0. Com diferença `π/2`, o resultado fica perto de 1,41.

Esse é um detalhe de que gosto no projeto: a classificação visual e o número vêm da mesma função de física.

## Como executar

É necessário ter Node.js 22 ou mais recente.

```bash
git clone https://github.com/miguelconfuso/lambdo.git
cd lambdo
npm ci
npm run build
npm start
```

Se quiser abrir usando apenas o nome `lambdo`:

```bash
npm install -g .
lambdo
```

O terminal ideal tem pelo menos 80 colunas e 24 linhas.

## Formas de usar

No modo `TRAVELLING`, a tela mostra uma onda se deslocando e os valores derivados da equação. No modo `INTERFERENCE`, ela mostra a Onda A, a Onda B e a soma das duas.

As setas para cima e para baixo escolhem o parâmetro. As setas laterais alteram o valor. `Space` pausa o tempo, `M` troca o modo, `P` alterna rapidamente a fase da Onda B e `H` abre uma explicação do estado atual.

Também existem comandos que não abrem a animação:

```bash
npm run compare
node dist/cli.js --compare --json
node dist/cli.js --snapshot --wavelength 8 --frequency 2
node dist/cli.js --snapshot --mode interference
```

O modo `compare` é útil para conferir os casos de reforço, interferência parcial e cancelamento. O modo `snapshot` gera um quadro fixo e ajuda a testar o desenho.

## Por que o renderizador é próprio

A primeira interface ficou muito pesada e chegou a consumir memória demais. O problema não era a equação. O terminal recebia mais atualizações do que conseguia desenhar.

Eu retirei o framework da execução final e fiz um renderizador ANSI direto. Hoje ele compara o quadro novo com o anterior, escreve somente as regiões alteradas, limita a taxa de atualização e respeita a pausa do fluxo de saída. O projeto terminou sem dependências de execução.

Separei o código em três partes principais:

* `src/physics/wave.ts` faz os cálculos e valida os parâmetros;
* `src/rendering/wave.ts` transforma amostras numéricas em uma linha Unicode contínua;
* `src/terminal.ts` cuida da tela, do teclado e das atualizações.

Essa divisão não foi criada só para deixar as pastas bonitas. Ela permite testar a física e o desenho sem precisar simular uma pessoa apertando teclas.

## O que este projeto representa para mim

O Lambdo foi o primeiro projeto em que um erro de desempenho me obrigou a mudar a estrutura, não apenas ajustar um número. Também foi uma forma de perceber que entender uma fórmula fica mais fácil quando eu consigo experimentar casos extremos e conferir o resultado.

Ainda quero estudar reflexão, ondas estacionárias, nós e ventres. Antes disso, o estado atual pode ser verificado com:

```bash
npm test
npm run typecheck
npm run build
```

O projeto usa a licença [MIT](LICENSE).
