# LifeOS

Sistema operacional pessoal open source para organizar rotina, hábitos, projetos, fé e saúde — com uma única fonte da verdade.

**Produção:** [lifeos.guilhermesales.com](https://lifeos.guilhermesales.com)

Conta de demonstração: `demo@lifeos.app` / `LifeOS-Demo-2026!`

## O que tem

- Dashboard do dia (foco, tarefas, hábitos, score, agenda)
- Calendário, tarefas, hábitos com atraso inteligente e sequências
- Life Tracking (sono, água, humor, energia, refeições)
- Estatísticas, projetos, vila gamificada e conquistas
- Hermes: dicas geradas a partir dos seus dados
- Login por e-mail/senha **e** Google (OAuth 2.0 / OpenID Connect)
- Sincronização bidirecional com Google Calendar
- Servidor MCP (Streamable HTTP em `/mcp`) + API REST com o mesmo token
- Contas com sessão em cookie httpOnly; XP e níveis só no servidor
- SQLite como fonte única (`DATA_DIR/lifeos.db`)

## Rodar com Docker

```bash
docker build -t lifeos .
docker run -d --name lifeos -p 3030:3030 \
  -e SESSION_SECRET=uma-chave-longa \
  -e DATA_DIR=/data \
  -e PUBLIC_BASE_URL=https://lifeos.guilhermesales.com \
  -v lifeos-data:/data \
  lifeos
```

Acesse `http://localhost:3030`. O container escuta em `3030` (Traefik/Cloudflare terminam o TLS na frente).

## Desenvolvimento

```bash
cp .env.example .env
npm install
# terminal 1
node server/index.js
# terminal 2
npm run dev
```

O Vite encaminha `/api` e `/mcp` para `http://127.0.0.1:3030`.

```bash
npm test
```

## Google Cloud Console (OAuth)

1. Crie um projeto em [Google Cloud Console](https://console.cloud.google.com/).
2. **APIs e serviços → Biblioteca**: ative **Google Calendar API**.
3. **Tela de consentimento OAuth**: tipo Externo (ou Interno se for Workspace). Escopos:
   - `openid`
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `https://www.googleapis.com/auth/calendar.events`
4. **Credenciais → Criar credenciais → ID do cliente OAuth → Aplicativo da Web**.
5. **URIs de redirecionamento autorizados** (cadastre os que for usar):

| Ambiente | Redirect URI |
| --- | --- |
| Produção | `https://lifeos.guilhermesales.com/api/auth/google/callback` |
| Local | `http://localhost:3030/api/auth/google/callback` |
| Vite (`npm run dev`) | `http://localhost:5173/api/auth/google/callback` |

A URI efetiva é `{PUBLIC_BASE_URL}/api/auth/google/callback`. Se `PUBLIC_BASE_URL` estiver vazio, o servidor monta a partir de `X-Forwarded-Proto` + `Host` (já há `trust proxy`).

6. Copie o Client ID e o Client secret para as env vars abaixo.
7. Em **Público-alvo**, adicione os e-mails de teste enquanto o app OAuth estiver em modo Testing.

O mesmo grant pede Calendar com `access_type=offline` e guarda o refresh token cifrado em `DATA_DIR`.

## Variáveis

| Variável | Padrão | Uso |
| --- | --- | --- |
| `PORT` | `3030` | Porta HTTP |
| `NODE_ENV` | — | `production` liga cookie `secure` |
| `SESSION_SECRET` | dev | Assinatura do cookie |
| `SESSION_TTL_DAYS` | `30` | Validade da sessão |
| `DATA_DIR` | `./data` | Pasta do SQLite (volume `/data` no Docker) |
| `DEMO_EMAIL` / `DEMO_PASSWORD` | ver `.env.example` | Conta demo criada no boot |
| `PUBLIC_BASE_URL` | (Host do request) | Base canônica, ex. `https://lifeos.guilhermesales.com` |
| `GOOGLE_CLIENT_ID` | — | OAuth client |
| `GOOGLE_CLIENT_SECRET` | — | OAuth secret |
| `ALLOWED_EMAILS` | vazio = qualquer | Allowlist de e-mails Google (vírgula) |
| `TOKEN_ENCRYPTION_KEY` | deriva de `SESSION_SECRET` | AES-256-GCM dos tokens Google |
| `MCP_BOOTSTRAP_TOKEN` | — | Bearer inicial, sem criar token na UI |
| `MCP_BOOTSTRAP_USER_EMAIL` | — | Usuário que o bootstrap assume |
| `TZ_NAME` | `America/Sao_Paulo` | Fuso das datas do MCP/API |
| `CALENDAR_SYNC_INTERVAL_MS` | `900000` | Sync periódica (0 desliga) |

### Dokploy

No mesmo application (Dockerfile na `main`, volume em `/data`). **Não faça push para `main` por este PR.** Depois do merge, acrescente no painel:

```
PUBLIC_BASE_URL=https://lifeos.guilhermesales.com
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
ALLOWED_EMAILS=seu-email@gmail.com
TOKEN_ENCRYPTION_KEY=outra-chave-longa
MCP_BOOTSTRAP_TOKEN=opcional
MCP_BOOTSTRAP_USER_EMAIL=seu-email@gmail.com
TZ_NAME=America/Sao_Paulo
```

Mantenha as atuais: `NODE_ENV`, `PORT`, `DATA_DIR`, `SESSION_SECRET`, `SESSION_TTL_DAYS`, `DEMO_EMAIL`, `DEMO_PASSWORD`.

## Google Calendar

- Mesmo login Google pede o escopo de eventos + offline access.
- Quem já entrou com senha pode **Conectar Google Calendar** em Configurações.
- Sync incremental (`syncToken`); se o token expirar (410), refaz full sync.
- Eventos criados no LifeOS vão para o Calendar (propriedade privada `lifeosEventId` + etag evitam loop).
- Recorrência semanal vira `RRULE:FREQ=WEEKLY;BYDAY=...`.
- Botão **Sincronizar agora** no calendário e nas configurações. A sync periódica roda no processo.

Caminho manual de teste: conectar Google → criar um bloco de rotina no LifeOS → ver no Calendar → editar no Calendar → **Sincronizar agora** → ver a mudança no LifeOS, sem duplicata.

## MCP

Transporte: **Streamable HTTP** (JSON-RPC 2.0) em `POST /mcp` (também em `/api/mcp`).

1. Entre no LifeOS → **Configurações** (engrenagem) → **Tokens MCP / API** → **Criar**.
2. Copie o valor `lifeos_tok_...` (aparece uma vez).
3. Ou defina `MCP_BOOTSTRAP_TOKEN` nas env vars.

Auth: `Authorization: Bearer <token>`.

Datas omissas usam o dia atual em `America/Sao_Paulo`.

### Exemplo de config de cliente

```json
{
  "mcpServers": {
    "lifeos": {
      "url": "https://lifeos.guilhermesales.com/mcp",
      "headers": {
        "Authorization": "Bearer lifeos_tok_xxxxxxxx_yyyy"
      }
    }
  }
}
```

Local: `http://localhost:3030/mcp` (ou a porta do Vite, que faz proxy).

### Tools (resumo)

`list/create/update` hábitos, tarefas, eventos e projetos; `complete_habit`, `toggle_habit`, `set_habit_value`; **`log_activity`** (ex.: “fui no jiu-jitsu hoje”); `log_bible_reading`, `log_prayer`; `get_today`, `get_week`, `get_discipline`; `create/update/delete_event` (sync Calendar); `sync_calendar`; `get/update_settings`; `save_tracking`; `start/stop_focus`; `get_insights`, `get_alerts`; tokens MCP.

A API REST equivalente usa o mesmo cookie ou Bearer: `/api/activity/log`, `/api/agenda`, `/api/week`, `/api/discipline`, `/api/calendar/sync`, `/api/tokens`, `/api/insights`, `/api/alerts`, etc.

## Licença

MIT
