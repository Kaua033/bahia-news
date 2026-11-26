# Bahia News — Diário do Farol

Portal de notícias da Bahia construído com Next.js 14 (App Router), TypeScript,
Tailwind CSS, Prisma/PostgreSQL e NextAuth.

O feed da home vem da [NewsAPI](https://newsapi.org). O banco já tem o schema de
usuários, artigos, categorias, tags e comentários, mas o painel administrativo
ainda é um esqueleto (login/CRUD não implementados).

## Rodando localmente

```bash
npm install
cp .env.example .env   # se existir; senão crie o .env com as variáveis abaixo
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

Variáveis de ambiente:

| Variável | Obrigatória | Uso |
| --- | --- | --- |
| `DATABASE_URL` | sim | Postgres (pooler do Neon em produção) |
| `DIRECT_URL` | sim | Conexão direta do Neon para migrations |
| `NEXTAUTH_URL` | sim | URL pública do site |
| `NEXTAUTH_SECRET` | sim | Assinatura dos JWT do NextAuth |
| `NEWSAPI_KEY` | sim | Feed de notícias da home |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | não | Credenciais criadas pelo seed |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | não | Upload de imagens |
| `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | não | Upload de imagens |

## Deploy no Cloudflare Workers

O projeto usa [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare)
para rodar no Workers. A configuração está em `wrangler.jsonc` e
`open-next.config.ts`.

### Workers Builds (Git)

Ao conectar o repositório em **Workers & Pages → Create → Connect to Git**, use:

| Campo | Valor |
| --- | --- |
| Build command | `npm run cf:build` (ou `npm run build`) |
| Deploy command | `npx wrangler deploy` |
| Preview command | `npx wrangler versions upload` |

O `npm run build` roda o build do Next e, no `postbuild`, converte o resultado
para o formato do Workers (`opennextjs-cloudflare build --skipNextBuild`) e
remove do bundle o engine nativo do Prisma e os engines MySQL/SQLite que não são
usados. Sem essa poda o Worker passa de 10 MB; com ela fica em ~1 MB comprimido.

### Variáveis e secrets

Configure em **Settings → Variables and Secrets** do Worker:

- `NEWSAPI_KEY`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (ex.: `https://bahia-news.SEU-SUBDOMINIO.workers.dev`)
- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` (se for usar imagens)

Em **Settings → Build → Build variables and secrets**, configure apenas as
variáveis `NEXT_PUBLIC_*` usadas no build.

### Limites

- Workers Free: 3 MiB comprimido. Este Worker fica em ~1 MiB, então cabe no free.
- Workers Paid: 10 MiB comprimido.

### Comandos úteis

```bash
npm run cf:build   # build + prune do bundle
npm run preview    # roda o Worker localmente
npm run deploy     # build + deploy (requer wrangler login)
```

## Limitações conhecidas

- Next.js 14 está no fim do ciclo de vida; o adaptador está fixado em
  `@opennextjs/cloudflare@1.14.10`, a última versão que aceita Next 14.
  Para atualizar, migre para Next 15/16 e troque o adaptador para a versão atual.
- O Prisma Client ainda **não** usa driver adapter no Workers. O site público
  (NewsAPI) funciona, mas login/área admin não persistem no Cloudflare até essa
  adaptação ser feita (`@prisma/adapter-neon` ou Hyperdrive + `@prisma/adapter-pg`).
- Login e CRUD do admin são stubs.
- `npm run build` já gera o Worker; `npm run cf:build` é um alias explícito.
