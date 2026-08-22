# Publicando uma versão

O número da tag precisa ser igual ao campo `version` do `package.json`.

Antes de publicar:

```bash
npm ci
npm run check
npm pack --dry-run
```

Depois de atualizar o changelog e enviar o commit para `main`, crie a tag:

```bash
git tag -a v0.1.0 -m "Lambdo v0.1.0"
git push origin v0.1.0
```

O workflow `release.yml` confere a versão, executa os testes, gera o arquivo `.tgz` e cria a GitHub Release automaticamente.

A mesma tag inicia `github-packages.yml`, que executa uma nova verificação e publica o código como `@miguelconfuso/lambdo` no GitHub Packages. A autenticação usa o `GITHUB_TOKEN` do repositório, sem token salvo no código.

Os dois workflows também podem ser acompanhados pela aba Actions.
