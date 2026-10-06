import type { ConversationSummary } from '../api'

interface SidebarProps {
  conversations: ConversationSummary[]
  activeId: number | null
  onSelect: (id: number) => void
  onNew: () => void
  onDelete: (id: number) => void
  deleteDisabled?: boolean
}

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' })

function formatDate(value: string): string {
  // SQLite returns naive UTC timestamps ("2026-10-02T17:05:00"); mark them as UTC.
  const iso = /[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`
  return dateFormat.format(new Date(iso))
}

export default function Sidebar({ conversations, activeId, onSelect, onNew, onDelete, deleteDisabled = false }: SidebarProps) {
  return (
    <aside className="sidebar">
      <h1 className="sidebar-title">Study Buddy</h1>
      <button className="new-button" onClick={onNew}>
        + Nouvelle conversation
      </button>
      <nav className="conversation-list">
        {conversations.length === 0 && <p className="muted">Aucune conversation.</p>}
        {conversations.map((c) => (
          <div
            key={c.id}
            className={`conversation-item${c.id === activeId ? ' active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <button
              type="button"
              onClick={() => onSelect(c.id)}
              style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer', padding: '0.25rem' }}
            >
              <span className="conversation-preview" style={{ display: 'block' }}>{c.preview ?? 'Nouvelle conversation'}</span>
              <span className="conversation-date" style={{ display: 'block' }}>{formatDate(c.created_at)}</span>
            </button>
            <button
              type="button"
              aria-label={`Supprimer la conversation du ${formatDate(c.created_at)}`}
              title="Supprimer la conversation"
              disabled={deleteDisabled}
              onClick={(event) => {
                event.stopPropagation()
                onDelete(c.id)
              }}
              style={{ flexShrink: 0, border: 0, borderRadius: '6px', padding: '0.4rem', color: '#f87171', background: 'transparent', cursor: deleteDisabled ? 'not-allowed' : 'pointer', opacity: deleteDisabled ? 0.45 : 0.8 }}
              onMouseEnter={(event) => { if (!deleteDisabled) event.currentTarget.style.backgroundColor = 'rgba(248, 113, 113, 0.14)' }}
              onMouseLeave={(event) => { event.currentTarget.style.backgroundColor = 'transparent' }}
            >
              🗑️
            </button>
          </div>
        ))}
      </nav>
    </aside>
  )
}
