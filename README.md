# Annotations

Parsers de anotações e adaptadores de compatibilidade do Lógos, implementados em **LógosType (`.type`)**. Repositório: [ThinkIac/annotations](https://github.com/ThinkIac/annotations).

## Instalar

```sh
npm install ThinkIac/annotations#main
```

Para instalações reproduzíveis, substitua `main` pelo SHA do commit aprovado. O pacote mantém o nome `@thinkiac/module-annotations`; a versão desta extração é `0.2.0`. Node 18 ou superior para o adaptador e ferramentas de desenvolvimento. O compilador [LogosType](https://github.com/ThinkIac/LogosType) está fixado em commit no manifest e lockfile e é usado no build, sem dependência de produção.

## Uso

```js
const { parseTool } = require('@thinkiac/module-annotations/parsers.cjs');
function buscar(id) { return { id }; }
const metadata = parseTool(buscar, [
  '@register tool buscar',
  '@description Busca pelo identificador',
  '@param {number} id - Identificador do usuário'
].join('\n'));
console.log(metadata.name); // buscar
console.log(metadata.parameters[0].description); // Identificador do usuário
```

A biblioteca recebe o handler e o texto de documentação já resolvido. Não executa o handler durante o parsing. Continua aceitando os formatos legados que o pacote anterior aceitava; nem todos os parsers legados reconhecem todos os registros modernos. O compilador da linguagem é responsável por normalizar a sintaxe `.type`, assinaturas e diretivas antes dessa camada de compatibilidade.

## Estrutura

| Fonte | Responsabilidade |
| --- | --- |
| `src/parsers.type` | Tools, hooks, rotas, comandos, predicados, middlewares e módulos legados |
| `src/jsdoc.type` | Associação de comentários acima/dentro de funções, tags e condições |
| `src/index.type` | Scanners injetados, cache por scanner e conversão de parâmetros para JSON Schema |
| `src/conditions.type` | Avaliação assíncrona de `only`, `when` e `never` |
| `src/middleware.type` | Snapshot de predicados e execução da cadeia |
| `src/manifest.type` | Geração e escrita de manifest por capacidades injetadas |
| `src/node.type` | Adaptador opcional com `node:fs` e `node:path` |
| `dist/*.cjs` | Saída gerada e versionada, não editar manualmente |
| `*.cjs` na raiz | Pontos de entrada estáveis de compatibilidade |

Todos os sete arquivos de implementação foram convertidos para `.type`. JavaScript permanece nos pontos de entrada, scripts e testes, além da saída compilada. Não há JavaScript embutido em blocos de escape nos fontes `.type`.

## Capacidades e portabilidade

O núcleo não importa `fs`, `path`, rede ou processos. O manifest recebe `readPackage`, `basename`, `now` e `writeManifest`. Essas funções podem ser implementadas em memória, por eventos autorizados do host ou por outro ambiente. Somente `src/node.type` acessa APIs Node.

```js
const { create } = require('@thinkiac/module-annotations/manifest.cjs');
const manifest = create(scanners, {
  readPackage: async folder => ({ name: 'exemplo' }),
  basename: folder => folder.split('/').pop(),
  now: () => '2026-11-25T00:00:00.000Z',
  writeManifest: async (folder, file, text) => {
    // Encaminhar ao provedor autorizado do host ou armazenar em memória.
    return `${folder}/${file}`;
  }
});
await manifest.generateManifest('packages/exemplo');
```

`create(scanners)` sem capacidades mantém o comportamento Node anterior, carregando o adaptador sob demanda. `create(scanners, capabilities)` usa o núcleo portátil. Veja [contratos](docs/contracts.md) para as assinaturas completas e integração por eventos sem presumir um módulo de arquivos já instalado.

Esta extração é uma biblioteca de apoio aos provedores e scanners, como o pacote original. Ela não registra um novo tipo de recurso nem altera o bootstrap do Lógos. Não exige `createRuntimeModule`. A cópia incorporada em `/code/think` permanece preservada; trocar referências no host/perfil é uma etapa separada, após validar sua composição.

A ausência de APIs Node no núcleo não comprova execução no ESP32 ou QuickJS. A saída ainda usa CommonJS e recursos modernos de JavaScript (`Promise`, `Map`, `WeakMap`, regex e funções assíncronas); o host precisa oferecê-los ou adaptar a distribuição.

## Desenvolvimento e validação

```sh
npm ci
npm test
npm pack --dry-run
# Opcional: comparar com uma instalação anterior
node scripts/check-legacy.cjs /caminho/annotations-antigo
```

`npm run build` compila os fontes com o LogosType fixado. `prepare` permite instalação pelo repositório Git. A CI verifica Node 18, 20 e 22, testes e coerência da saída gerada. Testes cobrem regras de rotas, contratos de parâmetros, comandos, condições, scanners, middleware, manifest em memória e carregamento sem capacidades nativas. A comparação opcional verifica 728 combinações contra os parsers originais, incluindo erros.

[Guia de migração e limites](docs/migration.md). Licença MIT, preservada da distribuição de origem.
