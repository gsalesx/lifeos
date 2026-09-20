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
- Contas com sessão em cookie httpOnly; XP e níveis só no servidor
- SQLite como fonte única (`DATA_DIR/lifeos.db`)

## Rodar com Docker

```bash
docker build -t lifeos .
docker run -d --name lifeos -p 3030:3030 \
  -e SESSION_SECRET=uma-chave-longa \
  -e DATA_DIR=/data \
  -v lifeos-data:/data \
  lifeos
```

Acesse `http://localhost:3030`.

## Desenvolvimento

```bash
cp .env.example .env
npm install
# terminal 1
node server/index.js
# terminal 2
npm run dev
```

O Vite encaminha `/api` para `http://127.0.0.1:3030`.

## Variáveis

| Variável | Padrão | Uso |
| --- | --- | --- |
| `PORT` | `3030` | Porta HTTP |
| `SESSION_SECRET` | dev | Assinatura do cookie |
| `DATA_DIR` | `./data` | Pasta do SQLite |
| `DEMO_EMAIL` / `DEMO_PASSWORD` | ver `.env.example` | Conta demo criada no boot |

## Licença

MIT
