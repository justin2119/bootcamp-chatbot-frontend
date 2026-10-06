import type { AssistantMode } from '../api'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  models: string[]
  selectedModel: string
  setSelectedModel: (model: string) => void
  mode: AssistantMode
  setMode: (mode: AssistantMode) => void
  temperature: number
  setTemperature: (temperature: number) => void
  disabled?: boolean
}

export default function SettingsModal({ open, onClose, models, selectedModel, setSelectedModel, mode, setMode, temperature, setTemperature, disabled = false }: SettingsModalProps) {
  if (!open) return null
  return (
    <div className="settings-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header className="settings-modal-header">
          <div><p className="settings-eyebrow">RODIUMAI · CONFIGURATION</p><h2 id="settings-title">Paramètres</h2></div>
          <button className="settings-close" type="button" onClick={onClose} aria-label="Fermer les paramètres">×</button>
        </header>
        <div className="settings-fields">
          <label className="settings-field"><span>Modèle</span>
            <select value={selectedModel} onChange={(event) => setSelectedModel(event.target.value)} disabled={disabled}>
              {models.length === 0 && <option value="">Chargement…</option>}
              {models.map((model) => <option key={model} value={model}>{model}</option>)}
            </select>
            <small>Choisis le modèle qui répondra à tes questions.</small>
          </label>
          <label className="settings-field"><span className="settings-field-heading">Température <output>{temperature.toFixed(1)}</output></span>
            <input type="range" min="0" max="1" step="0.1" value={temperature} onChange={(event) => setTemperature(Number(event.target.value))} disabled={disabled} aria-label="Température" />
            <small>Une valeur basse favorise des réponses plus précises.</small>
          </label>
          <fieldset className="settings-field mode-field" disabled={disabled}>
            <legend>Mode / Persona</legend>
            <div className="persona-options">
              {([['default', 'Tuteur socratique', 'Apprendre en guidant le raisonnement'], ['quiz', 'Quiz', 'Réviser avec des questions'], ['summary', 'Résumé', 'Synthétiser les notions clés'], ['note', 'Fiche Note', 'Créer une fiche de révision']] as const).map(([value, title, description]) => (
                <label className={`persona-option${mode === value ? ' selected' : ''}`} key={value}>
                  <input type="radio" name="assistant-mode" value={value} checked={mode === value} onChange={() => setMode(value)} />
                  <span><strong>{title}</strong><small>{description}</small></span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <footer className="settings-modal-footer"><button type="button" className="settings-done" onClick={onClose}>Terminé</button></footer>
      </section>
    </div>
  )
}
