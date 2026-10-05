import { randomToken } from './crypto.js'
import { todayISO } from './dates.js'
import { TZ } from './dates.js'
import * as S from './services.js'
import { loadState } from './db.js'
import { createApiToken, listApiTokens, revokeApiToken } from './tokens.js'

const PROTOCOL = '2025-03-26'

const dateProp = {
  type: 'string',
  description: `Data YYYY-MM-DD no fuso ${TZ}. Se omitida, usa o dia atual nesse fuso.`,
}

function tool(name, description, properties, required = []) {
  return {
    name,
    description,
    inputSchema: {
      type: 'object',
      properties,
      required,
      additionalProperties: false,
    },
  }
}

export const TOOLS = [
  tool('list_habits', 'Lista hábitos do usuário, com logs e frequência.', {
    category: { type: 'string', description: 'Filtrar por área: fe, saude, trabalho, estudos, financas' },
  }),
  tool('create_habit', 'Cria um hábito (oração, Bíblia, jiu-jitsu, etc.).', {
    name: { type: 'string' },
    category: { type: 'string', description: 'fe | saude | trabalho | estudos | financas' },
    frequency: { description: 'daily, weekdays ou array de dias 0-6 (0=domingo)' },
    xp: { type: 'number' },
    time: { type: 'string', description: 'Horário HH:MM' },
    quantitative: { type: 'object', properties: { goal: { type: 'number' }, unit: { type: 'string' } } },
  }, ['name']),
  tool('update_habit', 'Atualiza um hábito existente.', {
    id: { type: 'string' },
    name: { type: 'string' },
    category: { type: 'string' },
    frequency: {},
    xp: { type: 'number' },
    time: { type: 'string' },
  }, ['id']),
  tool('complete_habit', 'Marca um hábito como feito numa data (não desfaz).', {
    id: { type: 'string' },
    date: dateProp,
  }, ['id']),
  tool('toggle_habit', 'Alterna o check-in de um hábito numa data.', {
    id: { type: 'string' },
    date: dateProp,
  }, ['id']),
  tool('set_habit_value', 'Define o valor quantitativo de um hábito (ex.: copos de água).', {
    id: { type: 'string' },
    value: { type: 'number' },
    date: dateProp,
  }, ['id', 'value']),
  tool('log_activity', 'Registra que uma atividade foi feita. Use quando o usuário disser algo como "fui no jiu-jitsu hoje" ou "li a Bíblia". Encontra hábito, evento ou tarefa pelo nome e marca como feito.', {
    name: { type: 'string', description: 'Nome da atividade: jiu-jitsu, Bíblia, oração, academia...' },
    date: dateProp,
    note: { type: 'string' },
  }, ['name']),
  tool('log_bible_reading', 'Registra leitura bíblica no dia.', { date: dateProp }),
  tool('log_prayer', 'Registra oração no dia.', { date: dateProp }),
  tool('list_tasks', 'Lista tarefas. Filtros opcionais por data e status.', {
    date: dateProp,
    done: { type: 'boolean' },
    includeArchived: { type: 'boolean' },
  }),
  tool('create_task', 'Cria uma tarefa.', {
    title: { type: 'string' },
    date: dateProp,
    time: { type: 'string' },
    priority: { type: 'string', enum: ['alta', 'media', 'baixa'] },
    area: { type: 'string' },
    projectId: { type: 'string' },
  }, ['title']),
  tool('update_task', 'Atualiza uma tarefa (título, data, done, arquivo...).', {
    id: { type: 'string' },
    title: { type: 'string' },
    date: dateProp,
    time: { type: 'string' },
    done: { type: 'boolean' },
    archived: { type: 'boolean' },
    priority: { type: 'string' },
  }, ['id']),
  tool('complete_task', 'Marca uma tarefa como concluída.', { id: { type: 'string' } }, ['id']),
  tool('list_events', 'Lista blocos de rotina / eventos da agenda.', {
    date: dateProp,
  }),
  tool('create_event', 'Cria um bloco de rotina. Se o Google Calendar estiver conectado, o evento é enviado ao Calendar.', {
    title: { type: 'string' },
    date: dateProp,
    time: { type: 'string' },
    timeEnd: { type: 'string' },
    location: { type: 'string' },
    description: { type: 'string' },
    recurrence: { type: 'string', enum: ['weekly'] },
    weekdays: { type: 'array', items: { type: 'number' }, description: '0=domingo … 6=sábado' },
  }, ['title']),
  tool('update_event', 'Atualiza um bloco de rotina e sincroniza com o Google Calendar se estiver conectado.', {
    id: { type: 'string' },
    title: { type: 'string' },
    date: dateProp,
    time: { type: 'string' },
    timeEnd: { type: 'string' },
    location: { type: 'string' },
    done: { type: 'boolean' },
    recurrence: { type: 'string' },
    weekdays: { type: 'array', items: { type: 'number' } },
  }, ['id']),
  tool('delete_event', 'Remove um bloco de rotina e o evento correspondente no Google Calendar.', {
    id: { type: 'string' },
  }, ['id']),
  tool('get_today', 'Agenda, hábitos, tarefas e score de hoje (America/Sao_Paulo).', {
    date: dateProp,
  }),
  tool('get_week', 'Agenda da semana (segunda a domingo) e % de disciplina.', {
    date: dateProp,
  }),
  tool('get_discipline', 'Percentual de adesão/disciplina da semana (hábitos, tarefas e eventos).', {
    date: dateProp,
  }),
  tool('sync_calendar', 'Dispara sincronização bidirecional com o Google Calendar agora.'),
  tool('get_calendar_status', 'Mostra se o Google Calendar está conectado e a última sincronização.'),
  tool('get_settings', 'Lê nome, e-mail, fuso e estado do Google.'),
  tool('update_settings', 'Altera o nome de exibição ou settings JSON.', {
    name: { type: 'string' },
    settings: { type: 'object' },
  }),
  tool('save_tracking', 'Registra sono, água, humor, energia e notas do dia.', {
    date: dateProp,
    bedTime: { type: 'string' },
    wakeTime: { type: 'string' },
    mood: { type: 'number' },
    stress: { type: 'number' },
    energy: { type: 'number' },
    water: { type: 'number' },
    meal: { type: 'string' },
    notes: { type: 'string' },
  }),
  tool('list_projects', 'Lista projetos.'),
  tool('create_project', 'Cria um projeto.', {
    name: { type: 'string' },
    color: { type: 'string' },
    description: { type: 'string' },
  }, ['name']),
  tool('update_project', 'Atualiza um projeto.', {
    id: { type: 'string' },
    name: { type: 'string' },
    status: { type: 'string', enum: ['planejamento', 'andamento', 'pausado', 'concluido'] },
    description: { type: 'string' },
    color: { type: 'string' },
  }, ['id']),
  tool('start_focus', 'Inicia um bloco de foco de 25 minutos numa tarefa.', {
    taskId: { type: 'string' },
  }, ['taskId']),
  tool('stop_focus', 'Encerra o foco atual.'),
  tool('get_insights', 'Dicas do Hermes com base nos dados do dia.'),
  tool('get_alerts', 'Tarefas atrasadas e hábitos pendentes de hoje.'),
  tool('list_api_tokens', 'Lista tokens MCP/API (prefixo apenas, sem o segredo).'),
  tool('create_api_token', 'Cria um token MCP/API. O valor secreto só aparece uma vez.', {
    name: { type: 'string' },
  }),
  tool('revoke_api_token', 'Revoga um token MCP/API.', { id: { type: 'string' } }, ['id']),
]

async function callTool(user, name, args = {}) {
  const date = args.date || todayISO()
  switch (name) {
    case 'list_habits': {
      const habits = loadState(user.id).habits
      return args.category ? habits.filter((h) => h.category === args.category) : habits
    }
    case 'create_habit':
      return S.createHabit(user, args)
    case 'update_habit':
      return S.updateHabit(user, args.id, args)
    case 'complete_habit':
      return S.markHabitDone(user, args.id, date)
    case 'toggle_habit':
      return S.toggleHabit(user, args.id, date)
    case 'set_habit_value':
      return S.setHabitValue(user, args.id, args.value, date)
    case 'log_activity':
      return S.logActivity(user, { name: args.name, date, note: args.note })
    case 'log_bible_reading':
      return S.logFaith(user, 'bible', date)
    case 'log_prayer':
      return S.logFaith(user, 'prayer', date)
    case 'list_tasks': {
      let tasks = loadState(user.id).tasks
      if (!args.includeArchived) tasks = tasks.filter((t) => !t.archived)
      if (args.date) tasks = tasks.filter((t) => t.date === args.date)
      if (args.done === true) tasks = tasks.filter((t) => t.done)
      if (args.done === false) tasks = tasks.filter((t) => !t.done)
      return tasks
    }
    case 'create_task':
      return S.createTask(user, args)
    case 'update_task':
      return S.updateTask(user, args.id, args)
    case 'complete_task':
      return S.updateTask(user, args.id, { done: true })
    case 'list_events': {
      const events = loadState(user.id).events
      if (!args.date) return events
      const { eventOnDate } = await import('./logic.js')
      return events.filter((e) => eventOnDate(e, args.date))
    }
    case 'create_event':
      return S.createEvent(user, args)
    case 'update_event':
      return S.updateEvent(user, args.id, args)
    case 'delete_event':
      return S.deleteEvent(user, args.id)
    case 'get_today':
      return S.getAgenda(user, date)
    case 'get_week':
      return S.getWeek(user, date)
    case 'get_discipline':
      return S.getDiscipline(user, date)
    case 'sync_calendar':
      return S.triggerSync(user)
    case 'get_calendar_status':
      return S.getSettings(user)
    case 'get_settings':
      return S.getSettings(user)
    case 'update_settings':
      S.updateProfile(user, args)
      return S.getSettings(user)
    case 'save_tracking':
      S.saveTracking(user, { ...args, date })
      return S.getAgenda(user, date).tracking
    case 'list_projects':
      return loadState(user.id).projects
    case 'create_project':
      return S.createProject(user, args)
    case 'update_project':
      return S.updateProject(user, args.id, args)
    case 'start_focus': {
      const { db } = await import('./db.js')
      db.prepare('UPDATE users SET focus_task_id = ?, focus_until = ? WHERE id = ?').run(args.taskId, Date.now() + 25 * 60 * 1000, user.id)
      return { ok: true, taskId: args.taskId }
    }
    case 'stop_focus': {
      const { db } = await import('./db.js')
      db.prepare('UPDATE users SET focus_until = NULL WHERE id = ?').run(user.id)
      return { ok: true }
    }
    case 'get_insights':
      return S.getInsights(user, date)
    case 'get_alerts':
      return S.getAlerts(user, date)
    case 'list_api_tokens':
      return listApiTokens(user.id)
    case 'create_api_token':
      return createApiToken(user.id, args.name || 'MCP')
    case 'revoke_api_token':
      return { ok: revokeApiToken(user.id, args.id) }
    default:
      throw Object.assign(new Error(`Ferramenta desconhecida: ${name}`), { status: 400 })
  }
}

function okResult(id, result) {
  return { jsonrpc: '2.0', id, result }
}

function errResult(id, code, message) {
  return { jsonrpc: '2.0', id, error: { code, message } }
}

export async function handleMcpMessage(user, message) {
  if (Array.isArray(message)) {
    const out = []
    for (const m of message) {
      const r = await handleMcpMessage(user, m)
      if (r) out.push(r)
    }
    return out
  }
  if (!message || message.jsonrpc !== '2.0') {
    return errResult(message?.id ?? null, -32600, 'JSON-RPC inválido')
  }
  const { id, method, params } = message
  if (id === undefined) return null

  try {
    if (method === 'initialize') {
      return okResult(id, {
        protocolVersion: PROTOCOL,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'lifeos', version: '0.2.0', title: 'LifeOS' },
        instructions: `LifeOS pessoal. Datas no fuso ${TZ}. Use log_activity para marcar hábitos/rotina do dia.`,
      })
    }
    if (method === 'ping') return okResult(id, {})
    if (method === 'tools/list') return okResult(id, { tools: TOOLS })
    if (method === 'tools/call') {
      const name = params?.name
      const args = params?.arguments || {}
      const data = await callTool(user, name, args)
      return okResult(id, {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        structuredContent: data,
      })
    }
    if (method === 'resources/list') return okResult(id, { resources: [] })
    if (method === 'prompts/list') return okResult(id, { prompts: [] })
    return errResult(id, -32601, `Método não suportado: ${method}`)
  } catch (err) {
    return okResult(id, {
      content: [{ type: 'text', text: err.message }],
      isError: true,
    })
  }
}

export function mountMcp(app, { requireBearer }) {
  const sessions = new Map()

  async function handlePost(req, res) {
    const user = req.user
    const accept = String(req.headers.accept || '')
    const body = req.body
    const isNotif = body && body.jsonrpc === '2.0' && body.id === undefined && !Array.isArray(body)
    if (isNotif) return res.status(202).end()

    const result = await handleMcpMessage(user, body)
    if (body?.method === 'initialize') {
      const sid = randomToken(16)
      sessions.set(sid, { userId: user.id, at: Date.now() })
      res.setHeader('Mcp-Session-Id', sid)
    }
    if (accept.includes('text/event-stream') && !accept.includes('application/json')) {
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.write(`event: message\ndata: ${JSON.stringify(result)}\n\n`)
      return res.end()
    }
    res.json(result)
  }

  app.post('/mcp', requireBearer, handlePost)
  app.post('/api/mcp', requireBearer, handlePost)
  app.get('/mcp', requireBearer, (_req, res) => {
    res.status(405).json({ error: 'Use POST JSON-RPC (Streamable HTTP) em /mcp' })
  })
  app.delete('/mcp', requireBearer, (req, res) => {
    const sid = req.get('mcp-session-id')
    if (sid) sessions.delete(sid)
    res.status(204).end()
  })
}

export { callTool }
