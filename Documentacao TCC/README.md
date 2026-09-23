# Controla.AI

Monorepo com **frontend** (Vite + React + Tailwind) e **backend** (Fastify + Drizzle + PostgreSQL).

Repositório: [github.com/visaobusinesstech/CONTROLAAIGastosDeploy](https://github.com/visaobusinesstech/CONTROLAAIGastosDeploy)

## Banco de dados (único: local + produção)

O banco oficial é **`controlaai`** no PostgreSQL Neon (mesmo host, database `controlaai`).

| Onde | Variável | Valor |
|------|----------|-------|
| Local | `DATABASE_URL` | `backend/.env` → `.../controlaai?sslmode=require` |
| Railway (backend) | `DATABASE_URL` | Variables → `.../controlaai?sslmode=require` |
| Frontend (Vercel) | `VITE_API_URL` | URL da API Railway |

Copie a connection string do Neon (com `sslmode=require` e banco **`controlaai`**) para `backend/.env` e para o Railway.

**Se aparecer `password authentication failed`:** a senha expirou. No [console Neon](https://console.neon.tech) → **Connection details** → **Reset password** → use a nova URL em local e no Railway → **Redeploy**.

Teste local: `cd backend && npm run db:check`

## Desenvolvimento

- **Tudo junto:** na raiz, `npm install` e `npm run dev` — frontend em http://localhost:5179 e backend na 3333.
- **Backend:** `cd backend && npm run dev` (porta 3333). Configure `.env` a partir de `.env.example`.
- **Frontend:** `cd frontend && npm run dev` (porta 5179).
- **Banco (Neon):** `cd backend && npm run db:setup` (cria tabelas + seed de categorias)
- **Pacote extenso de dados (conta leonardosena1010@hotmail.com):** `cd backend && npm run db:seed:rich`

Mapa completo do sistema: [MAPA_SISTEMA.md](./MAPA_SISTEMA.md)

## Deploy (Railway — backend)

1. Railway → **Root Directory** = `backend`
2. Variáveis: `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `OPENAI_API_KEY`, `ADMIN_EMAILS`, `BAILEYS_SESSION_DIR=/data/.baileys-session`
3. Volume persistente em `/data` (sessão WhatsApp)
4. Build via `railway.toml` / `Dockerfile` (`npm run build` → `dist/`)

## Git — subir alterações

```powershell
# Uma vez: instalar atalhos no terminal
.\scripts\setup-terminal.ps1

# Depois, de qualquer lugar:
capush "feat: minha alteração"

# Ou na raiz do projeto:
npm run git:push -- "feat: minha alteração"
```

Deploy rápido alternativo:

```powershell
.\deploy.ps1
```

## Deploy (Railway — backend)

1. No Railway: **Root Directory** = `backend`
2. Variáveis: `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `OPENAI_API_KEY`, `ADMIN_EMAILS`, `BAILEYS_SESSION_DIR=/data/.baileys-session`
3. Volume persistente em `/data` (sessão WhatsApp)
4. O build roda via `railway.toml` / `Dockerfile` (`npm run build` → `dist/`)

## Git — subir alterações

```powershell
# Uma vez: instalar atalhos no terminal
.\scripts\setup-terminal.ps1

# Depois, de qualquer lugar:
capush "feat: minha alteração"

# Ou na raiz do projeto:
npm run git:push -- "feat: minha alteração"
```

Repositório: https://github.com/visaobusinesstech/controla-ai

## Licença

Uso interno / projeto Controla.AI.
