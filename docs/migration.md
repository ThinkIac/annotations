# Extração e migração

Origem: `ThinkIac/ThinkIac`, `vendor/packages/modules/annotations`, comportamento reconciliado com a main da integração LógosType. A extração conserva o nome npm e os seis entrypoints CommonJS usados pela camada de compatibilidade. Nenhum import em `/code/think` foi trocado nesta publicação.

1. Instalar `ThinkIac/annotations#<commit>` em um host de teste.
2. Resolver `@thinkiac/module-annotations` e seus subpaths para este pacote.
3. Validar scanners, tools, comandos, HTTP, middleware e manifest da composição.
4. Fixar o commit no perfil/lockfile.
5. Remover a cópia incorporada apenas após validar essa substituição.

## Alterações

- Implementação autoral em `.type`, com JavaScript gerado em `dist`.
- Separação do manifest puro e do adaptador Node opcional.
- Capacidades explícitas para I/O e relógio.
- Build reproduzível com compilador fixado e lockfile.
- Compatibilidade de entrypoints para consumidores JavaScript existentes.

Não foram adicionados providers fictícios ou eventos inexistentes. Esta biblioteca de suporte não é por si um provedor `module annotations`: inventar esse registro mudaria o contrato de descoberta do pacote original. Os módulos de capacidades podem utilizá-la sem APIs de registro especiais do Lógos.

## Limites preservados

Os scanners genéricos e o barramento pertencem ao host. Os parsers legados continuam com as mesmas diferenças de sintaxe entre tipos de recurso; por exemplo, o parser legado de comandos aceita `@register_command`, sem adicionar uma nova promessa de normalização. O parse de módulos de compatibilidade não substitui o catálogo nativo atual do Lógos.

O adaptador Node preserva a API de filesystem anterior e exige controle de autoridade pelo host. A portabilidade comprovada nesta etapa é a separação de dependências e o uso de capacidades em memória sob Node; Rust/QuickJS/ESP32 não foram executados.
