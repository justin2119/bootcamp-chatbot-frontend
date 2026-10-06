import { useEffect, useRef, type FormEvent, type KeyboardEvent } from 'react'
import Markdown from 'react-markdown'
import type { AssistantMode, Role } from '../api'

export interface ChatMessage {
  role: Role
  content: string
}

interface ChatWindowProps {
  messages: ChatMessage[]
  loading: boolean
  draft: string
  onDraftChange: (value: string) => void
  onSend: () => void
  mode: AssistantMode
  onOpenSettings: () => void
  settingsSummary: string
  isStreaming: boolean
  onStopStreaming: () => void
}

const modeLabels: Record<AssistantMode, string> = {
  default: 'Tuteur socratique',
  quiz: 'Quiz',
  summary: 'Résumé',
  note: 'Fiche Note',
}

export default function ChatWindow({ messages, loading, draft, onDraftChange, onSend, mode, onOpenSettings, settingsSummary, isStreaming, onStopStreaming }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!loading && draft.trim()) onSend()
  }
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) handleSubmit(event)
  }

  return (
    <section className="chat">
      <header className="chat-header">
        <div><h1>Study Buddy</h1><span className="muted">{settingsSummary}</span></div>
        <button className="settings-trigger" type="button" onClick={onOpenSettings} aria-label="Ouvrir les paramètres">⚙️ <span>Paramètres</span></button>
      </header>
      <div className="messages">
        {messages.length === 0 && !loading && <p className="muted center">Pose ta première question à Study Buddy.</p>}
        {messages.map((m, i) => m.role === 'system-notification' ? (
          <div key={i} className="notification">{m.content}</div>
        ) : m.role === 'user' ? (
          <div key={i} className="bubble user">{m.content}</div>
        ) : m.role === 'assistant' ? (
          <article key={i} className="bubble assistant"><Markdown>{m.content}</Markdown></article>
        ) : m.role === 'quiz' || m.role === 'summary' || m.role === 'note' ? (
          <article key={i} className={`bubble role-${m.role}`}><span className={`role-badge badge-${m.role}`}>{modeLabels[m.role]}</span><div><Markdown>{m.content}</Markdown></div></article>
        ) : (
          <div key={i} className="bubble custom-role"><span className="role-badge">{m.role}</span><div>{m.content}</div></div>
        ))}
        {loading && messages[messages.length - 1]?.content === '' && <div className={`bubble ${mode === 'default' ? 'assistant' : `role-${mode}`} typing`}>…</div>}
        <div ref={bottomRef} />
      </div>
      <form className="composer" onSubmit={handleSubmit}>
        <textarea value={draft} onChange={(e) => onDraftChange(e.target.value)} onKeyDown={handleKeyDown} placeholder="Écris ton message…" rows={2} disabled={loading} autoFocus />
        {isStreaming && <button type="button" className="stop-button" onClick={onStopStreaming}>Arrêter</button>}
        <button type="submit" disabled={loading || !draft.trim()}>Envoyer</button>
      </form>
    </section>
  )
}
