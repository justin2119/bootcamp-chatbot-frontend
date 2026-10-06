// Thin typed wrappers around the FastAPI backend (proxied under /api by Vite).

export type Role = 'user' | 'assistant' | 'system-notification' | 'quiz' | 'summary' | 'note' | string
export type AssistantMode = 'default' | 'quiz' | 'summary' | 'note'

export interface ConversationSummary {
  id: number
  created_at: string
  preview: string | null
}

export interface Message {
  seq: number
  role: Role
  content: string
  created_at: string
}

export interface ModelsResult {
  models: string[]
  default: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })
  } catch {
    throw new Error('Impossible de joindre le serveur.')
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const detail = typeof body?.detail === 'string' ? body.detail : null
    throw new Error(detail ?? `Erreur ${response.status}`)
  }
  return response.json() as Promise<T>
}

export function getModels(): Promise<ModelsResult> {
  return request('/models')
}

export function listConversations(): Promise<ConversationSummary[]> {
  return request('/conversations')
}

export async function createConversation(): Promise<number> {
  const { conversation_id } = await request<{ conversation_id: number }>('/conversations', {
    method: 'POST',
  })
  return conversation_id
}

export async function deleteConversation(id: string | number): Promise<void> {
  await request<{ ok: boolean }>(`/conversations/${id}`, { method: 'DELETE' })
}

export function getMessages(conversationId: number): Promise<Message[]> {
  return request(`/conversations/${conversationId}/messages`)
}

export interface ChatResult {
  reply: string
  notification: string | null
}

export function sendMessage(conversationId: number, message: string, temperature = 0.7, mode: AssistantMode = 'default'): Promise<ChatResult> {
  return request('/chat', {
    method: 'POST',
    body: JSON.stringify({ conversation_id: conversationId, message, temperature, mode }),
  })
}

export interface SendMessageStreamOptions {
  conversation_id: number
  message: string
  model?: string
  temperature?: number
  mode?: AssistantMode
  signal?: AbortSignal
  onChunk: (text: string) => void
  onNotification?: (notification: string) => void
}

function emitPayload(raw: string, options: SendMessageStreamOptions): boolean {
  const data = raw.trim()
  if (!data || data === '[DONE]') return data === '[DONE]'
  try {
    const payload: any = JSON.parse(data)
    const notification = payload.notification ?? payload.system_notification
    if (typeof notification === 'string') options.onNotification?.(notification)
    const text = payload.choices?.[0]?.delta?.content ?? payload.delta?.content ?? payload.delta ?? payload.chunk ?? payload.token ?? payload.content ?? payload.text
    if (typeof text === 'string' && text) options.onChunk(text)
    else if (typeof payload.reply === 'string' && payload.reply) options.onChunk(payload.reply)
  } catch {
    options.onChunk(raw)
  }
  return false
}

export async function sendMessageStream(options: SendMessageStreamOptions): Promise<void> {
  const { conversation_id, message, model, temperature = 0.7, mode = 'default', signal } = options
  let response: Response
  try {
    response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream, application/json' },
      body: JSON.stringify({ conversation_id, message, ...(model ? { model } : {}), temperature, mode, stream: true }),
      signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new Error('Impossible de joindre le serveur.')
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(typeof body?.detail === 'string' ? body.detail : `Erreur ${response.status}`)
  }
  if (!response.body) throw new Error('Le serveur ne prend pas en charge le streaming.')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const isSse = response.headers.get('content-type')?.includes('text/event-stream') ?? false
  let buffer = ''
  let done = false
  while (!done) {
    const result = await reader.read()
    done = result.done
    buffer += decoder.decode(result.value, { stream: !done })
    if (isSse) {
      let boundary: number
      while ((boundary = buffer.indexOf('\n\n')) >= 0 || (boundary = buffer.indexOf('\r\n\r\n')) >= 0) {
        const event = buffer.slice(0, boundary)
        const separator = buffer.slice(boundary).startsWith('\r\n\r\n') ? 4 : 2
        buffer = buffer.slice(boundary + separator)
        const data = event.split(/\r?\n/).filter((line) => line.startsWith('data:')).map((line) => line.slice(5).replace(/^ /, '')).join('\n')
        if (data && emitPayload(data, options)) { await reader.cancel(); return }
      }
    } else if (buffer) {
      let newline: number
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newline).replace(/\r$/, '')
        buffer = buffer.slice(newline + 1)
        if (emitPayload(line, options)) { await reader.cancel(); return }
      }
    }
  }
  if (buffer.trim()) {
    if (isSse) {
      const data = buffer.split(/\r?\n/).filter((line) => line.startsWith('data:')).map((line) => line.slice(5).replace(/^ /, '')).join('\n')
      if (data) emitPayload(data, options)
    } else emitPayload(buffer, options)
  }
}
