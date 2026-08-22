# Lambdo

**Veja a onda. Entenda a matemática.**

Lambdo é um laboratório interativo de ondas que funciona inteiramente no terminal. As equações de ondas viajantes e interferência viram uma visualização viva, controlável e formada por caracteres Unicode.

> A tela não é uma animação pronta: cada quadro é calculado usando os parâmetros físicos atuais.

## O que já funciona

- Onda viajante unidimensional animada.
- Controles de amplitude, comprimento de onda, frequência, fase e escala temporal.
- Interferência mostrando Onda A, Onda B e a superposição.
- Classificação de interferência construtiva, destrutiva ou parcial.
- Inspetor de velocidade, número de onda e frequência angular.
- Modo estático `--snapshot` para scripts e terminais não interativos.
- Motores de física e renderização separados da interface.
- Testes automatizados das propriedades matemáticas.

## Equações usadas

```text
y(x,t) = A sin(kx - ωt + φ)
v = λf        k = 2π/λ        ω = 2πf        T = 1/f
ytotal(x,t) = yA(x,t) + yB(x,t)
```

## Executar

É necessário ter Node.js 22 ou superior.

```bash
npm install
npm run dev
```

Para compilar e disponibilizar o comando `lambdo`:

```bash
npm run build
npm link
lambdo
```

## Controles

| Tecla | Ação |
| --- | --- |
| `↑` / `↓` | Selecionar parâmetro |
| `←` / `→` | Alterar valor |
| `Espaço` | Pausar ou continuar |
| `M` ou `Tab` | Trocar modo |
| `1` / `2` | Onda viajante / interferência |
| `P` | Alternar a fase da Onda B |
| `H` | Abrir guia das equações |
| `R` | Restaurar laboratório |
| `Q` | Sair |

## Próximas etapas

- Reflexão em extremidades fixas e livres.
- Ondas estacionárias, nós e ventres.
- Solver numérico 1D por diferenças finitas.
- Inspeção de estabilidade e energia.
- Simulação bidimensional.

## Licença

MIT
