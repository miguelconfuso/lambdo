<div align="center">
  <img src="./docs/assets/lambdo.png" width="280" alt="Lambdo" />
  <p><strong>Veja a onda. Entenda a matemática.</strong></p>
  <p>Mude a equação. Veja a física responder.</p>
  <p>
    <a href="https://github.com/miguelconfuso/lambdo/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/miguelconfuso/lambdo/ci.yml?branch=main&style=flat-square&label=build" /></a>
    <img alt="Node.js 22+" src="https://img.shields.io/badge/Node.js-22%2B-339933?style=flat-square&logo=nodedotjs&logoColor=white" />
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-7-3178C6?style=flat-square&logo=typescript&logoColor=white" />
    <img alt="Versão 0.1.0" src="https://img.shields.io/badge/version-0.1.0-f05c58?style=flat-square" />
    <a href="./LICENSE"><img alt="MIT" src="https://img.shields.io/github/license/miguelconfuso/lambdo?style=flat-square" /></a>
  </p>
  <p><a href="./README.md">English</a> · <strong>Português</strong></p>
</div>

<p align="center">
  <img src="./docs/assets/lambdo-interference.svg" width="940" alt="Lambdo visualizando interferência parcial no terminal" />
</p>

---

Lambdo é um laboratório interativo de física de ondas que funciona inteiramente no terminal. Ele visualiza ondas viajantes, fase e interferência diretamente a partir dos parâmetros físicos — sem animações prontas e sem framework de interface em tempo de execução.

## A diferença aparece na tela e nos números

Para duas ondas iguais de amplitude `1`, alterar somente a diferença de fase leva o resultado do reforço total ao cancelamento completo.

| Caso | Diferença de fase | Amplitude resultante | Máximo | Classificação |
|---|---:|---:|---:|---|
| Em fase | `0,00 rad` | `2,00` | `100%` | Construtiva |
| Quarto de ciclo | `1,57 rad` | `1,41` | `71%` | Parcial |
| Fases opostas | `3,14 rad` | `0,00` | `0%` | Destrutiva |

Os valores vêm do mesmo motor de física usado pela interface. Reproduza a comparação com:

```bash
npm run compare
```

Para amplitudes iguais, o resultado analítico é `Aresult = 2A · |cos(Δφ / 2)|`.

## Início rápido

É necessário ter Node.js 22 ou superior e um terminal com pelo menos 80 × 24 caracteres.

```bash
git clone https://github.com/miguelconfuso/lambdo.git
cd lambdo
npm ci
npm run build
npm start
```

Para instalar o comando globalmente a partir do projeto clonado:

```bash
npm install -g .
lambdo
```

## Por que Lambdo?

Lambdo nasceu enquanto eu estudava ondas e interferência em física. Eu queria que alterar `λ`, `f`, `A` ou `φ` mostrasse imediatamente o efeito real daquele valor sobre uma onda.

O objetivo é simples: **ver a equação se comportar**.

## O laboratório

- Onda viajante unidimensional animada.
- Controles de amplitude, comprimento de onda, frequência, fase e escala temporal.
- Visualização da Onda A, Onda B e da superposição resultante.
- Classificação construtiva, destrutiva, parcial e cancelada.
- Trilhos de fase, barra de intensidade e equações vivas.
- Modo Learn contextual explicando o estado físico atual.
- Modos determinísticos de snapshot e comparação para scripts e CI.
- Renderização ANSI direta, atualizando apenas regiões alteradas e respeitando a fila de saída.
- Nenhuma dependência de runtime; CLI compilado com aproximadamente 19 KB.

## Modelo físico

| Grandeza | Relação | Significado |
|---|---|---|
| Deslocamento | `y(x,t) = A sin(kx − ωt + φ)` | Posição da onda no espaço e tempo |
| Velocidade | `v = λf` | Distância percorrida por segundo |
| Número de onda | `k = 2π/λ` | Frequência angular espacial |
| Frequência angular | `ω = 2πf` | Frequência angular temporal |
| Período | `T = 1/f` | Tempo de um ciclo completo |
| Superposição | `ytotal = y₁ + y₂` | Soma dos deslocamentos simultâneos |

Cada ponto exibido é recalculado usando os parâmetros atuais.

## CLI

```bash
# Abrir o laboratório interativo
npm start

# Comparação reproduzível de interferência
npm run compare

# Comparação legível por máquinas
node dist/cli.js --compare --json

# Quadros determinísticos sem abrir a interface
node dist/cli.js --snapshot --wavelength 8 --frequency 2
node dist/cli.js --snapshot --mode interference
```

Use `node dist/cli.js --help` para ver todas as opções.

<details>
<summary><strong>Mapa do teclado</strong></summary>

| Tecla | Ação |
|---|---|
| `↑` / `↓` | Selecionar parâmetro |
| `←` / `→` | Alterar valor |
| `Espaço` | Pausar ou continuar |
| `M` ou `Tab` | Trocar modo |
| `1` / `2` | Onda viajante / interferência |
| `P` | Alternar a Onda B entre fase igual e oposta |
| `H` | Abrir o modo Learn contextual |
| `R` | Restaurar o laboratório |
| `Q` | Sair |

</details>

## Arquitetura

```text
             ┌──────────────────┐
             │ Motor de física  │
             │     wave.ts      │
             └────────┬─────────┘
                      │
                      ▼
             ┌──────────────────┐
             │ Dados simulados  │
             └────────┬─────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│ Renderer Unicode │    │ Snapshot/compare │
└─────────┬────────┘    └──────────────────┘
          ▼
┌──────────────────┐
│ Terminal ANSI    │
│ diff + backpress │
└──────────────────┘
```

A física é independente da apresentação. As mesmas funções analíticas alimentam animação, snapshots, comparações e testes.

## Verificações de engenharia

```bash
npm ci
npm run check
```

O comando executa testes matemáticos e de renderização, verifica o TypeScript e produz o bundle final. A CI repete a instalação travada e a mesma verificação em cada push e pull request.

## Documentos do projeto

- [Roteiro de apresentação](docs/PRESENTATION.md)
- [Processo de release](docs/RELEASING.md)
- [Histórico de versões](CHANGELOG.md)
- [Como contribuir](CONTRIBUTING.md)
- [Política de segurança](SECURITY.md)

## Próximas etapas

- Reflexão em extremidades fixas e livres.
- Ondas estacionárias, nós e ventres.
- Solver numérico 1D por diferenças finitas.
- Inspeção de estabilidade, energia e convergência.
- Simulação bidimensional.

## Licença

[MIT](LICENSE) — use, estude e adapte.
