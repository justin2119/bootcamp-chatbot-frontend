import { useEffect, useRef, type FormEvent, type KeyboardEvent } from 'react'
import Markdown from 'react-markdown'
import type { Role } from '../api'

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
  models: string[]
  selectedModel: string
  setSelectedModel: (model: string) => void
  isStreaming: boolean
  onStopStreaming: () => void
}

export default function ChatWindow({ messages, loading, draft, onDraftChange, onSend, models, selectedModel, setSelectedModel, isStreaming, onStopStreaming }: ChatWindowProps) {
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
        <div><h1>Study Buddy</h1><span className="muted">Choisis ton modèle</span></div>
        <label className="model-selector"><span className="sr-only">Modèle</span>
          <select value={selectedModel} onChange={(event) => setSelectedModel(event.target.value)} disabled={loading}>
            {models.length === 0 && <option value="">Chargement…</option>}
            {models.map((model) => <option key={model} value={model}>{model}</option>)}
          </select>
        </label>
      </header>
      <div className="messages">
        {messages.length === 0 && !loading && <p className="muted center">Pose ta première question à Study Buddy.</p>}
        {messages.map((m, i) => m.role === 'system-notification' ? (
          <div key={i} className="notification">{m.content}</div>
        ) : m.role === 'quiz' ? (
          <article key={i} className="bubble quiz"><span className="role-badge">Quiz</span><div>{m.content}</div></article>
        ) : (
          <div key={i} className={`bubble ${m.role === 'user' ? 'user' : m.role === 'assistant' ? 'assistant' : 'custom-role'}`}>
            {m.role === 'assistant' ? <Markdown>{m.content}</Markdown> : <><span className="role-badge">{m.role}</span><div>{m.content}</div></>}
          </div>
        ))}
        {loading && messages[messages.length - 1]?.content === '' && <div className="bubble assistant typing">…</div>}
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
