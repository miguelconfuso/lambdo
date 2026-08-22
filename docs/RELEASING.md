# Release process

## Prepare

1. Confirm that `CHANGELOG.md` describes the release.
2. Confirm that `package.json` contains the intended version.
3. Run the locked verification:

```bash
npm ci
npm run check
npm pack --dry-run
```

4. Test the packed command in a temporary directory if the CLI packaging changed.

## Tag and publish on GitHub

```bash
git tag -a v0.1.0 -m "Lambdo v0.1.0"
git push origin main
git push origin v0.1.0
```

Create a GitHub Release from the tag using the matching changelog section.

## npm

Publish only after the GitHub release and package dry run are both verified:

```bash
npm publish
```

Publishing requires an npm account with two-factor authentication configured. Never commit registry tokens or recovery codes.
