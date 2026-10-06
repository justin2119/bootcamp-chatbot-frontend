import { useEffect, useRef, useState } from 'react'
import './App.css'
import {
  createConversation,
  deleteConversation,
  getMessages,
  getModels,
  listConversations,
  sendMessageStream,
  type ConversationSummary,
} from './api'
import ChatWindow, { type ChatMessage } from './components/ChatWindow'
import Sidebar from './components/Sidebar'

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Une erreur est survenue.'
}

export default function App() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [models, setModels] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState('')
  const [temperature, setTemperature] = useState(0.7)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    getModels().then(({ models: available, default: defaultModel }) => {
      setModels(available)
      setSelectedModel(defaultModel || available[0] || '')
    }).catch((err) => setError(errorMessage(err)))
    listConversations()
      .then((list) => {
        setConversations(list)
        if (list.length > 0) setActiveId(list[0].id)
      })
      .catch((err) => setError(errorMessage(err)))
  }, [])

  useEffect(() => {
    if (activeId === null) return
    let cancelled = false
    getMessages(activeId)
      .then((list) => {
        if (!cancelled) setMessages(list.map(({ role, content }) => ({ role, content })))
      })
      .catch((err) => !cancelled && setError(errorMessage(err)))
    return () => { cancelled = true }
  }, [activeId])

  function selectConversation(id: number) {
    if (loading || id === activeId) return
    setError(null)
    setDraft('')
    setMessages([])
    setActiveId(id)
  }

  async function handleNew() {
    if (loading) return
    setError(null)
    try {
      const id = await createConversation()
      setConversations((list) => [{ id, created_at: new Date().toISOString(), preview: null }, ...list])
      setDraft('')
      setMessages([])
      setActiveId(id)
    } catch (err) { setError(errorMessage(err)) }
  }

  async function handleDelete(id: number) {
    if (loading) return
    setError(null)
    try {
      await deleteConversation(id)
      const remaining = conversations.filter((conversation) => conversation.id !== id)
      setConversations(remaining)
      if (activeId === id) {
        setMessages([])
        setDraft('')
        setActiveId(remaining[0]?.id ?? null)
      }
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  function handleStopStreaming() {
    abortControllerRef.current?.abort()
  }

  async function handleSend() {
    if (activeId === null || loading) return
    const text = draft.trim()
    if (!text) return
    const conversationId = activeId
    const isFirstMessage = messages.length === 0
    const assistantIndex = messages.length + 1
    const controller = new AbortController()
    abortControllerRef.current = controller
    setError(null)
    setDraft('')
    setMessages((list) => [...list, { role: 'user', content: text }, { role: 'assistant', content: '' }])
    setLoading(true)
    setIsStreaming(true)
    try {
      await sendMessageStream({
        conversation_id: conversationId,
        message: text,
        model: selectedModel || undefined,
        temperature,
        signal: controller.signal,
        onChunk: (chunk) => setMessages((list) => list.map((item, index) => index === assistantIndex ? { ...item, content: item.content + chunk } : item)),
        onNotification: (notification) => setMessages((list) => [...list, { role: 'system-notification', content: notification }]),
      })
      if (isFirstMessage) setConversations(await listConversations())
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setMessages((list) => list.filter((_, index) => index !== assistantIndex))
        setDraft(text)
        setError(errorMessage(err))
      }
    } finally {
      if (abortControllerRef.current === controller) abortControllerRef.current = null
      setLoading(false)
      setIsStreaming(false)
    }
  }

  return (
    <div className="app">
      <Sidebar conversations={conversations} activeId={activeId} onSelect={selectConversation} onNew={handleNew} onDelete={handleDelete} deleteDisabled={loading} />
      <main className="main">
        {error && <div className="error" role="alert">{error}<button onClick={() => setError(null)} aria-label="Fermer">×</button></div>}
        {activeId === null ? (
          <div className="empty"><p>Aucune conversation ouverte.</p><button className="new-button" onClick={handleNew}>+ Nouvelle conversation</button></div>
        ) : (
          <ChatWindow
            messages={messages}
            loading={loading}
            draft={draft}
            onDraftChange={setDraft}
            onSend={handleSend}
            models={models}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            temperature={temperature}
            setTemperature={setTemperature}
            isStreaming={isStreaming}
            onStopStreaming={handleStopStreaming}
          />
        )}
      </main>
    </div>
  )
}
