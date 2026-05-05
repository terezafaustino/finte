import { useState, useMemo } from 'react'
import { useFinance } from '../contexts/FinanceContext'
import { formatBRL, MONTHS_PT, yearMonths } from '../utils/calculations'

const genId = () => `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
const parseAmt = (str) => parseFloat(String(str).replace(',', '.')) || 0

const PERSON_OPTS = [
  { id: 'tereza',    label: 'Tereza',    color: 'var(--pink)',   badge: 'badge-tereza' },
  { id: 'sebastiao', label: 'Sebastião', color: 'var(--purple)', badge: 'badge-sebastiao' },
  { id: 'both',      label: 'Ambos',     color: 'var(--blue)',   badge: 'badge-both' },
]

const ICON_OPTIONS = ['📺','💼','📚','✈️','☁️','🤖','🎮','🎵','📰','💊','🏋️','🔧','💡','🌐','📷','🎨']

const inputStyle = (active) => ({
  width: 72, padding: '4px 6px',
  border: `1.5px solid ${active ? 'var(--purple)' : 'var(--border)'}`,
  borderRadius: 6, fontSize: 12, fontWeight: 600,
  textAlign: 'right', background: 'var(--card)',
  color: 'var(--text-primary)', outline: 'none',
  transition: 'border-color 0.15s',
})

export default function Assinaturas() {
  const { config, saveSubscription, deleteSubscription, saveSubCategories } = useFinance()

  const subs = config.subscriptions || []
  const cats = config.subscriptionCategories || []

  const currentYear = new Date().getFullYear()
  const [year, setYear]           = useState(currentYear)
  const [filterCat, setFilterCat] = useState('all')
  const [editVals, setEditVals]   = useState({})   // `${subId}_${monthKey}` → string
  const [activeCell, setActiveCell] = useState(null)

  // Add subscription
  const [showAddSub, setShowAddSub] = useState(false)
  const [newSub, setNewSub]         = useState({ label: '', category: '', person: 'tereza' })
  const [saving, setSaving]         = useState(false)

  // Add category
  const [showAddCat, setShowAddCat] = useState(false)
  const [newCat, setNewCat]         = useState({ label: '', icon: '⭐', color: '#6366F1' })

  // Delete
  const [confirmDel, setConfirmDel] = useState(null)

  const months = yearMonths(year)  // ['2026-01',...,'2026-12']

  // ── helpers ──────────────────────────────────────────────
  const catOf = (id) => cats.find(c => c.id === id) || { label: id || '—', icon: '📋', color: '#94A3B8' }

  const cellKey = (subId, monthKey) => `${subId}_${monthKey}`

  const getCellVal = (sub, monthKey) => {
    const k = cellKey(sub.id, monthKey)
    if (editVals[k] !== undefined) return editVals[k]
    const v = sub.amounts?.[monthKey]
    return v != null && v !== 0 ? String(v) : ''
  }

  const handleCellChange = (sub, monthKey, val) => {
    setEditVals(p => ({ ...p, [cellKey(sub.id, monthKey)]: val }))
  }

  const handleCellBlur = async (sub, monthKey) => {
    setActiveCell(null)
    const k = cellKey(sub.id, monthKey)
    const raw = editVals[k]
    if (raw === undefined) return
    const val = parseAmt(raw)
    const updated = { ...sub, amounts: { ...(sub.amounts || {}), [monthKey]: val } }
    await saveSubscription(updated)
    setEditVals(p => { const n = { ...p }; delete n[k]; return n })
  }

  const subTotal = (sub) => months.reduce((a, m) => a + (sub.amounts?.[m] || 0), 0)

  // ── Add subscription ─────────────────────────────────────
  const handleAddSub = async () => {
    if (!newSub.label.trim()) return
    setSaving(true)
    const sub = {
      id: genId(),
      label: newSub.label.trim(),
      category: newSub.category || (cats[0]?.id || ''),
      person: newSub.person,
      amounts: {},
    }
    await saveSubscription(sub)
    setNewSub({ label: '', category: cats[0]?.id || '', person: 'tereza' })
    setShowAddSub(false)
    setSaving(false)
  }

  // ── Add category ─────────────────────────────────────────
  const handleAddCat = async () => {
    if (!newCat.label.trim()) return
    const id = newCat.label.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    const cat = { id, label: newCat.label.trim(), icon: newCat.icon, color: newCat.color }
    await saveSubCategories([...cats, cat])
    setNewCat({ label: '', icon: '⭐', color: '#6366F1' })
    setShowAddCat(false)
  }

  const handleDeleteCat = async (catId) => {
    await saveSubCategories(cats.filter(c => c.id !== catId))
  }

  // ── Analytics ────────────────────────────────────────────
  const analytics = useMemo(() => {
    const byMonth = Object.fromEntries(months.map(m => [m, 0]))
    const byCat   = {}
    const byPerson = { tereza: 0, sebastiao: 0 }

    subs.forEach(sub => {
      months.forEach(m => {
        const v = sub.amounts?.[m] || 0
        byMonth[m] += v
        byCat[sub.category] = (byCat[sub.category] || 0) + v
        if (sub.person === 'tereza')    byPerson.tereza    += v
        else if (sub.person === 'sebastiao') byPerson.sebastiao += v
        else if (sub.person === 'both') { byPerson.tereza += v / 2; byPerson.sebastiao += v / 2 }
      })
    })

    const totalAnnual = Object.values(byMonth).reduce((a, v) => a + v, 0)
    const maxMonth    = Math.max(...Object.values(byMonth), 1)
    const topCat      = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0]

    return { byMonth, byCat, byPerson, totalAnnual, maxMonth, topCat }
  }, [subs, months])

  const visibleSubs = filterCat === 'all' ? subs : subs.filter(s => s.category === filterCat)

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="page-body">

      {/* ── Cabeçalho ── */}
      <div className="flex justify-between items-center mb-24" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 20 }}>Assinaturas</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            Gestão anual de assinaturas · independente do mês de referência
          </div>
        </div>
        <div className="flex items-center gap-10" style={{ flexWrap: 'wrap' }}>
          {/* Seletor de ano */}
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            style={{
              padding: '6px 12px', borderRadius: 8, border: '1.5px solid var(--border)',
              background: 'var(--card)', color: 'var(--text-primary)', fontWeight: 600, fontSize: 13,
            }}
          >
            {[currentYear - 1, currentYear, currentYear + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={() => setShowAddCat(v => !v)}
            style={{
              padding: '7px 14px', borderRadius: 8, border: '1.5px solid var(--border)',
              background: 'var(--card)', color: 'var(--text-primary)', fontWeight: 600, fontSize: 13,
              cursor: 'pointer',
            }}
          >
            + Categoria
          </button>
          <button
            onClick={() => setShowAddSub(v => !v)}
            style={{
              padding: '7px 16px', borderRadius: 8, border: 'none',
              background: 'var(--purple)', color: '#fff', fontWeight: 700, fontSize: 13,
              cursor: 'pointer',
            }}
          >
            + Nova assinatura
          </button>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid-4 mb-24">
        <div className="metric-card" style={{ background: 'var(--grad-primary)' }}>
          <div className="metric-card-icon">📋</div>
          <div className="metric-card-label">Total Anual</div>
          <div className="metric-card-value">{formatBRL(analytics.totalAnnual)}</div>
          <div className="metric-card-sub">{subs.length} assinaturas em {year}</div>
        </div>
        <div className="metric-card" style={{ background: 'var(--grad-red)' }}>
          <div className="metric-card-icon">T</div>
          <div className="metric-card-label">Tereza</div>
          <div className="metric-card-value">{formatBRL(analytics.byPerson.tereza)}</div>
          <div className="metric-card-sub">Total no ano</div>
        </div>
        <div className="metric-card" style={{ background: 'var(--grad-blue)' }}>
          <div className="metric-card-icon">S</div>
          <div className="metric-card-label">Sebastião</div>
          <div className="metric-card-value">{formatBRL(analytics.byPerson.sebastiao)}</div>
          <div className="metric-card-sub">Total no ano</div>
        </div>
        <div className="metric-card" style={{ background: 'var(--grad-green)' }}>
          <div className="metric-card-icon">{analytics.topCat ? catOf(analytics.topCat[0]).icon : '📊'}</div>
          <div className="metric-card-label">Maior categoria</div>
          <div className="metric-card-value">{analytics.topCat ? formatBRL(analytics.topCat[1]) : '—'}</div>
          <div className="metric-card-sub">{analytics.topCat ? catOf(analytics.topCat[0]).label : 'Nenhuma'}</div>
        </div>
      </div>

      {/* ── Dashboard ── */}
      <div className="grid-2 gap-24 mb-24">

        {/* Gastos por mês */}
        <div className="card">
          <div className="section-title">📅 Gasto por Mês — {year}</div>
          {months.map(m => {
            const val = analytics.byMonth[m] || 0
            const pct = analytics.maxMonth > 0 ? (val / analytics.maxMonth) * 100 : 0
            const [, mo] = m.split('-')
            return (
              <div key={m} style={{ marginBottom: 10 }}>
                <div className="flex justify-between items-center" style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, width: 32 }}>{MONTHS_PT[parseInt(mo) - 1]}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--purple)' }}>{formatBRL(val)}</span>
                </div>
                <div className="progress-bar-wrap" style={{ height: 6 }}>
                  <div className="progress-bar-fill" style={{ width: `${pct}%`, background: 'var(--purple)' }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Gastos por categoria */}
        <div className="card">
          <div className="section-title">🏷️ Gasto por Categoria</div>
          {cats.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>Nenhuma categoria cadastrada.</div>
          )}
          {cats.map(cat => {
            const val = analytics.byCat[cat.id] || 0
            const pct = analytics.totalAnnual > 0 ? (val / analytics.totalAnnual) * 100 : 0
            return (
              <div key={cat.id} style={{ marginBottom: 12 }}>
                <div className="flex justify-between items-center" style={{ marginBottom: 4 }}>
                  <div className="flex items-center gap-6">
                    <span>{cat.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{cat.label}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{formatBRL(val)}</span>
                </div>
                <div className="progress-bar-wrap" style={{ height: 6 }}>
                  <div className="progress-bar-fill" style={{ width: `${pct}%`, background: cat.color }} />
                </div>
              </div>
            )
          })}

          {/* Por pessoa */}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <div className="section-title" style={{ marginBottom: 10 }}>👥 Por Responsável</div>
            {[
              { label: 'Tereza',    val: analytics.byPerson.tereza,    color: 'var(--pink)' },
              { label: 'Sebastião', val: analytics.byPerson.sebastiao, color: 'var(--purple)' },
            ].map(p => (
              <div key={p.label} style={{ marginBottom: 10 }}>
                <div className="flex justify-between items-center" style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{p.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{formatBRL(p.val)}</span>
                </div>
                <div className="progress-bar-wrap" style={{ height: 6 }}>
                  <div className="progress-bar-fill" style={{
                    width: analytics.totalAnnual > 0 ? `${(p.val / analytics.totalAnnual) * 100}%` : '0%',
                    background: p.color,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Formulário nova assinatura ── */}
      {showAddSub && (
        <div className="card mb-16" style={{ border: '2px solid var(--purple)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Nova assinatura</div>
          <div className="flex items-center gap-10" style={{ flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Nome (ex: Netflix, Duolingo…)"
              value={newSub.label}
              onChange={e => setNewSub(p => ({ ...p, label: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleAddSub()}
              style={{
                flex: 1, minWidth: 180, padding: '7px 12px',
                border: '1.5px solid var(--border)', borderRadius: 8,
                fontSize: 13, background: 'var(--card)', color: 'var(--text-primary)', outline: 'none',
              }}
              autoFocus
            />
            <select
              value={newSub.category}
              onChange={e => setNewSub(p => ({ ...p, category: e.target.value }))}
              style={{
                padding: '7px 12px', borderRadius: 8, border: '1.5px solid var(--border)',
                background: 'var(--card)', color: 'var(--text-primary)', fontSize: 13,
              }}
            >
              <option value="">Categoria</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
            </select>
            <select
              value={newSub.person}
              onChange={e => setNewSub(p => ({ ...p, person: e.target.value }))}
              style={{
                padding: '7px 12px', borderRadius: 8, border: '1.5px solid var(--border)',
                background: 'var(--card)', color: 'var(--text-primary)', fontSize: 13,
              }}
            >
              {PERSON_OPTS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <button
              onClick={handleAddSub}
              disabled={saving || !newSub.label.trim()}
              style={{
                padding: '7px 20px', borderRadius: 8, border: 'none',
                background: 'var(--purple)', color: '#fff', fontWeight: 700, fontSize: 13,
                cursor: saving ? 'wait' : 'pointer', opacity: !newSub.label.trim() ? 0.5 : 1,
              }}
            >
              {saving ? 'Salvando…' : 'Adicionar'}
            </button>
            <button
              onClick={() => setShowAddSub(false)}
              style={{
                padding: '7px 14px', borderRadius: 8, border: '1.5px solid var(--border)',
                background: 'var(--card)', color: 'var(--text-secondary)', fontWeight: 600,
                fontSize: 13, cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Gerenciar categorias ── */}
      {showAddCat && (
        <div className="card mb-16" style={{ border: '2px solid var(--border)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Gerenciar categorias</div>

          {/* Lista existente */}
          <div className="flex items-center gap-8 mb-14" style={{ flexWrap: 'wrap' }}>
            {cats.map(cat => (
              <div key={cat.id} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 10px', borderRadius: 20,
                background: cat.color + '20', border: `1.5px solid ${cat.color}40`,
              }}>
                <span>{cat.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: cat.color }}>{cat.label}</span>
                <button
                  onClick={() => handleDeleteCat(cat.id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', fontSize: 12, padding: 0, lineHeight: 1,
                  }}
                  title="Remover categoria"
                >✕</button>
              </div>
            ))}
          </div>

          {/* Nova categoria */}
          <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Nova categoria
          </div>
          <div className="flex items-center gap-10" style={{ flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Nome da categoria"
              value={newCat.label}
              onChange={e => setNewCat(p => ({ ...p, label: e.target.value }))}
              style={{
                flex: 1, minWidth: 160, padding: '7px 12px',
                border: '1.5px solid var(--border)', borderRadius: 8,
                fontSize: 13, background: 'var(--card)', color: 'var(--text-primary)', outline: 'none',
              }}
            />
            <select
              value={newCat.icon}
              onChange={e => setNewCat(p => ({ ...p, icon: e.target.value }))}
              style={{
                padding: '7px 10px', borderRadius: 8, border: '1.5px solid var(--border)',
                background: 'var(--card)', color: 'var(--text-primary)', fontSize: 14,
              }}
            >
              {ICON_OPTIONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
            </select>
            <input
              type="color"
              value={newCat.color}
              onChange={e => setNewCat(p => ({ ...p, color: e.target.value }))}
              style={{ width: 40, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer', padding: 2 }}
              title="Cor da categoria"
            />
            <button
              onClick={handleAddCat}
              disabled={!newCat.label.trim()}
              style={{
                padding: '7px 18px', borderRadius: 8, border: 'none',
                background: 'var(--purple)', color: '#fff', fontWeight: 700, fontSize: 13,
                cursor: 'pointer', opacity: !newCat.label.trim() ? 0.5 : 1,
              }}
            >
              Salvar
            </button>
            <button
              onClick={() => setShowAddCat(false)}
              style={{
                padding: '7px 14px', borderRadius: 8, border: '1.5px solid var(--border)',
                background: 'var(--card)', color: 'var(--text-secondary)', fontWeight: 600,
                fontSize: 13, cursor: 'pointer',
              }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* ── Filtros por categoria ── */}
      <div className="flex items-center gap-8 mb-16" style={{ flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilterCat('all')}
          style={{
            padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: filterCat === 'all' ? '2px solid var(--purple)' : '1.5px solid var(--border)',
            background: filterCat === 'all' ? 'var(--purple)' : 'var(--card)',
            color: filterCat === 'all' ? '#fff' : 'var(--text-secondary)',
          }}
        >
          Todas ({subs.length})
        </button>
        {cats.map(cat => {
          const count = subs.filter(s => s.category === cat.id).length
          if (count === 0) return null
          const active = filterCat === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => setFilterCat(active ? 'all' : cat.id)}
              style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: active ? `2px solid ${cat.color}` : '1.5px solid var(--border)',
                background: active ? cat.color + '20' : 'var(--card)',
                color: active ? cat.color : 'var(--text-secondary)',
              }}
            >
              {cat.icon} {cat.label} ({count})
            </button>
          )
        })}
      </div>

      {/* ── Tabela ── */}
      {subs.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-text">
              Nenhuma assinatura cadastrada.<br />
              Clique em <strong>+ Nova assinatura</strong> para começar.
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--bg)', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 12, minWidth: 160, position: 'sticky', left: 0, background: 'var(--bg)', zIndex: 2 }}>
                    Nome
                  </th>
                  <th style={{ padding: '10px 10px', textAlign: 'left', fontWeight: 700, fontSize: 12, minWidth: 100 }}>
                    Categoria
                  </th>
                  <th style={{ padding: '10px 10px', textAlign: 'left', fontWeight: 700, fontSize: 12, minWidth: 90 }}>
                    Responsável
                  </th>
                  {months.map(m => {
                    const [, mo] = m.split('-')
                    return (
                      <th key={m} style={{ padding: '10px 4px', textAlign: 'center', fontWeight: 700, fontSize: 11, minWidth: 80, color: 'var(--text-secondary)' }}>
                        {MONTHS_PT[parseInt(mo) - 1]}/{String(year).slice(2)}
                      </th>
                    )
                  })}
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, fontSize: 12, minWidth: 90, color: 'var(--text-secondary)' }}>
                    Total/Ano
                  </th>
                  <th style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 700, fontSize: 12, minWidth: 50 }} />
                </tr>
              </thead>
              <tbody>
                {visibleSubs.map((sub, idx) => {
                  const cat    = catOf(sub.category)
                  const person = PERSON_OPTS.find(p => p.id === sub.person) || PERSON_OPTS[0]
                  const total  = subTotal(sub)

                  return (
                    <tr
                      key={sub.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: idx % 2 === 0 ? 'var(--card)' : 'var(--bg)',
                      }}
                    >
                      {/* Nome */}
                      <td style={{ padding: '10px 14px', fontWeight: 600, fontSize: 13, position: 'sticky', left: 0, background: idx % 2 === 0 ? 'var(--card)' : 'var(--bg)', zIndex: 1 }}>
                        {sub.label}
                      </td>

                      {/* Categoria */}
                      <td style={{ padding: '10px 10px' }}>
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '3px 8px', borderRadius: 12,
                          background: cat.color + '20', fontSize: 11, fontWeight: 600, color: cat.color,
                        }}>
                          {cat.icon} {cat.label}
                        </div>
                      </td>

                      {/* Responsável */}
                      <td style={{ padding: '10px 10px' }}>
                        <span className={`badge ${person.badge}`} style={{ fontSize: 10 }}>
                          {person.label}
                        </span>
                      </td>

                      {/* Células mensais */}
                      {months.map(m => {
                        const k = cellKey(sub.id, m)
                        const isActive = activeCell === k
                        return (
                          <td key={m} style={{ padding: '6px 4px', textAlign: 'center' }}>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={getCellVal(sub, m)}
                              placeholder="—"
                              onChange={e => handleCellChange(sub, m, e.target.value)}
                              onFocus={() => setActiveCell(k)}
                              onBlur={() => handleCellBlur(sub, m)}
                              style={inputStyle(isActive)}
                            />
                          </td>
                        )
                      })}

                      {/* Total anual */}
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, fontSize: 13, color: total > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {total > 0 ? formatBRL(total) : '—'}
                      </td>

                      {/* Deletar */}
                      <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                        {confirmDel === sub.id ? (
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => deleteSubscription(sub.id).then(() => setConfirmDel(null))}
                              style={{ padding: '3px 8px', borderRadius: 6, border: 'none', background: 'var(--red)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setConfirmDel(null)}
                              style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer' }}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDel(sub.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-muted)', padding: 4 }}
                            title="Excluir assinatura"
                          >
                            🗑
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}

                {/* Linha de totais */}
                <tr style={{ background: 'var(--bg)', borderTop: '2px solid var(--border)', fontWeight: 700 }}>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-secondary)', position: 'sticky', left: 0, background: 'var(--bg)' }}>
                    Total mensal
                  </td>
                  <td colSpan={2} />
                  {months.map(m => {
                    const total = (filterCat === 'all' ? subs : visibleSubs)
                      .reduce((a, s) => a + (s.amounts?.[m] || 0), 0)
                    return (
                      <td key={m} style={{ padding: '10px 4px', textAlign: 'center', fontSize: 12, color: total > 0 ? 'var(--purple)' : 'var(--text-muted)' }}>
                        {total > 0 ? formatBRL(total) : '—'}
                      </td>
                    )
                  })}
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, color: 'var(--purple)' }}>
                    {formatBRL(visibleSubs.reduce((a, s) => a + subTotal(s), 0))}
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
