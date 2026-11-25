# Contratos

## Parsers e scanners

`parsers.cjs` exporta `parseRoute`, `parseTool`, `parseHook`, `parseCommand`, `parsePredicate`, `parseMiddleware`, `parseModule`, `parseOffline` e `OFFLINE_POLICIES`. Os parsers de recursos recebem `(handler, doc)` e retornam metadados ou `null`. Erros de configuração rejeitam o carregamento, como antes. `parseOffline(doc, method='get')` aceita `online` e `cache`; `cache` exige GET e `queue` continua recusado por falta de deduplicação.

O pacote não adiciona semântica própria a schemas ou assinatura LógosType. Essas informações vêm do compilador e do catálogo do host. Preserva o parse de parâmetros aninhados, listas, enum, enumSource, condições, reach, recuperação de tools e aliases/ordem de comandos.

`createScanners(registerGeneric)` recebe uma função `(folder, parser, kind, transform?)`. Retorna `registerTools`, `registerCommands`, `registerHooks`, `registerRoutes`, `registerPredicates`, `registerMiddlewares`. O host controla descoberta, acesso e autoridade. O cache usa a identidade de `registerGeneric` e não guarda decisões por requisição.

## Manifest

`manifest.cjs.create(scanners, capabilities?)` retorna:

- `generateManifest(folder): Promise<object>`.
- `writeManifest(folder, outFile='logos.json'): Promise<string>`.

`scanners` precisa oferecer `resolveAgentFolder` síncrono e os scanners de tools, hooks, rotas e comandos. Uma pasta não resolvida causa `Folder not found`.

`capabilities` é obrigatório na utilização portátil:

| Função | Contrato |
| --- | --- |
| `readPackage(folder)` | Objeto com `name`, `version`, `description`; síncrono ou Promise |
| `basename(folder)` | Nome de fallback, síncrono |
| `now()` | Data ISO como string, síncrono |
| `writeManifest(folder, file, text)` | Persiste texto e retorna destino como string ou Promise |

Falhas do provedor de capacidades são propagadas. O adaptador Node preserva a leitura tolerante de `package.json`: erro de leitura/JSON retorna objeto vazio. Ele não adiciona autorização própria, assim como a implementação anterior. O host deve validar caminhos e permissões antes de permitir escrita. Os parsers não precisam de cancelamento ou recursos externos; capacidades de I/O podem implementá-lo no host.

### Host baseado em eventos

É possível conectar as capacidades a um barramento sem importar APIs nativas:

```js
function capabilitiesFromEvents(call, targets) {
  return {
    readPackage: folder => call(targets.readPackage, { folder }),
    basename: folder => folder.replace(/\\/g, '/').split('/').pop(),
    now: () => new Date().toISOString(),
    writeManifest: (folder, file, text) => call(targets.writeManifest, { folder, file, text })
  };
}
```

`call` pode encaminhar para `$` no host e `targets` contém identidades reais escolhidas por esse host. Esses eventos não são registrados por annotations, nem se presume que exista `files::event:readText`. O provedor de arquivos deve retornar JSON simples, verificar autorização, limites, caminhos e falhas. Esta fronteira permite trocar o provedor sem alterar os parsers.

## Middleware e condições

`middleware.cjs.create(scanners)` retorna `loadMiddlewareSnapshot`, `resolveMiddlewares` e `runMiddlewares`. Snapshot pertence à geração; predicados são reavaliados por contexto. Predicado ausente mantém o comportamento legado de permitir. Falhas ao carregar predicados/middlewares são toleradas como no pacote original; falhas na execução são propagadas. Middlewares chamam `next()` explicitamente.

`conditions.cjs.resolveConditions(condition={}, context={})` retorna Promise booleano. `when` e `only` são cumulativos; qualquer `never` verdadeiro recusa a execução.
