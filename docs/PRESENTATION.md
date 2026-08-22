# Como eu apresentaria o Lambdo

Eu começaria mostrando a foto da anotação que originou o projeto. A equação `v = λf` ocupava pouco espaço no papel, mas cada símbolo mudava uma parte diferente da onda. O Lambdo foi a minha forma de transformar essa página em um experimento.

## Demonstração curta

1. Abra `lambdo` no modo de onda viajante.
2. Mude `λ` e mostre a distância entre dois ciclos.
3. Mude `f` e observe a velocidade, já que `v = λf`.
4. Entre no modo de interferência com `2`.
5. Compare `Δφ = 0`, `π/2` e `π`.
6. Pressione `H` para ligar o desenho às equações atuais.
7. Execute `npm run compare` para mostrar os mesmos casos em números.

## A parte técnica que eu destacaria

Cada ponto do traço é calculado pela equação da onda. O módulo de física não depende do terminal, então as mesmas funções são usadas na animação, na comparação e nos testes.

Também explicaria o problema de desempenho que apareceu durante o desenvolvimento. A primeira versão escrevia quadros demais e a memória crescia até o Node encerrar o processo. A solução foi fazer um renderizador ANSI que atualiza somente as regiões alteradas, reduz a frequência de quadros e espera o terminal aceitar mais dados.

Esse problema foi importante para mim porque a correção não veio de aumentar o limite de memória. Eu precisei entender onde o trabalho estava sendo criado.

## Perguntas que eu me prepararia para responder

**A animação é uma aproximação numérica?**

Não nesta versão. Ela amostra a solução analítica `y(x,t) = A sen(kx - ωt + φ)` em várias posições.

**Como o programa identifica interferência destrutiva?**

Ele calcula a amplitude resultante a partir das duas amplitudes e da diferença de fase. Para ondas iguais em fases opostas, o valor chega a zero.

**Por que usar o terminal?**

Eu queria um laboratório leve, controlável pelo teclado e fácil de executar. O limite visual do terminal também me obrigou a pensar na legibilidade da linha em frequências baixas.

## Comandos de apoio

```bash
npm start
npm run compare
node dist/cli.js --snapshot --mode interference
npm test
```
