# Contribuindo com o Lambdo

O Lambdo ainda é um projeto pequeno. Se você encontrou um erro de física, de desenho ou de terminal, pode abrir uma issue explicando quais valores usou e o que apareceu na tela.

Para executar uma cópia local:

```bash
git clone https://github.com/miguelconfuso/lambdo.git
cd lambdo
npm ci
npm run build
npm start
```

`npm run dev` é o comando mais rápido durante alterações. `npm run snapshot` ajuda quando basta conferir um quadro fixo.

Antes de enviar uma mudança, rode:

```bash
npm run check
npm run compare
```

A separação entre física e terminal é importante porque permite testar os cálculos sem depender da animação. Uma nova função física deve ter pelo menos um caso simples cujo resultado possa ser calculado à mão. Mudanças no renderizador também precisam funcionar com amplitude pequena, frequência baixa e cancelamento completo.

Não existe uma exigência especial para o nome dos commits. Uma descrição curta que explique a mudança já é suficiente.
