import { useState, useMemo } from 'react'
import { useFinance } from '../contexts/FinanceContext'
import { formatBRL, monthLabel } from '../utils/calculations'

const genId   = () => `ben_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
const parseAmt = (str) => parseFloat(String(str).replace(',', '.')) || 0
const todayStr = () => new Date().toISOString().slice(0, 10)

const ICON_OPTS = ['🚗','🛒','🍔','💊','💅','⛽','🏋️','🎬','🐾','🏠','🎁','💡','✈️','🩺','🍕','🧴']

const PERSONS = [
  { id: 'tereza',    label: 'Tereza',    color: 'var(--pink)',   avatar: 'T', badge: 'badge-tereza' },
  { id: 'sebastiao', label: 'Sebastião', color: 'var(--purple)', avatar: 'S', badge: 'badge-sebastiao' },
]

const inputSt = (focus) => ({
  padding: '6px 10px', border: `1.5px solid ${focus ? 'var(--purple)' : 'var(--border)'}`,
  borderRadius: 7, fontSize: 13, background: 'var(--card)', color: 'var(--text-primary)',
  outline: 'none', transition: 'border-color .15s',
})

export default function Beneficios() {
  const {
    config, monthData, currentMonth,
    saveBenefitDeposit, saveBenefitExpense, deleteBenefitExpense,
    saveBenefitCards, saveBenefitCategories,
  } = useFinance()

  const bCards = config.benefitCards      || []
  const bCats  = config.benefitCategories || []
  const deps   = monthData.benefitDeposits  || []
  const exps   = monthData.benefitExpenses  || []

  // ── deposit editing ─────────────────────────────────────
  const [depEdit, setDepEdit]   = useState({}) // `${cardId}_${person}` → string
  const [depFocus, setDepFocus] = useState(null)

  // ── expense form ────────────────────────────────────────
  const defaultForm = () => ({
    cardId: bCards[0]?.id || '',
    person: 'tereza',
    category: bCats[0]?.id || '',
    description: '',
    amount: '',
    date: todayStr(),
  })
  const [form, setForm]         = useState(defaultForm)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]     = useState(false)

  // ── category management ─────────────────────────────────
  const [showCatMgr, setShowCatMgr] = useState(false)
  const [newCat, setNewCat]         = useState({ label: '', icon: '⭐', color: '#6366F1' })

  // ── card management ─────────────────────────────────────
  const [showCardMgr, setShowCardMgr] = useState(false)
  const [newCard, setNewCard]         = useState({ label: '', icon: '💳', color: '#6366F1' })

  // ── filters ─────────────────────────────────────────────
  const [fCard,   setFCard]   = useState('all')
  const [fPerson, setFPerson] = useState('all')
  const [fCat,    setFCat]    = useState('all')

  // ── delete ───────────────────────────────────────────────
  const [confirmDel, setConfirmDel] = useState(null)

  // ── helpers ─────────────────────────────────────────────
  const catOf  = (id) => bCats.find(c => c.id === id)  || { label: id || '—', icon: '📋', color: '#94A3B8' }
  const cardOf = (id) => bCards.find(c => c.id === id)  || { label: id || '—', icon: '💳', color: '#94A3B8' }

  const getDeposit = (cardId, person) =>
    deps.find(d => d.cardId === cardId && d.person === person)?.amount || 0

  const getDepDisplay = (cardId, person) => {
    const k = `${cardId}_${person}`
    if (depEdit[k] !== undefined) return depEdit[k]
    const v = getDeposit(cardId, person)
    return v > 0 ? String(v) : ''
  }

  const cardTotalDeposit = (cardId) =>
    PERSONS.reduce((a, p) => a + getDeposit(cardId, p.id), 0)

  const cardTotalSpent = (cardId) =>
    exps.filter(e => e.cardId === cardId).reduce((a, e) => a + (e.amount || 0), 0)

  const personSpent = (cardId, person) =>
    exps.filter(e => e.cardId === cardId && e.person === person).reduce((a, e) => a + (e.amount || 0), 0)

  // ── deposit blur ─────────────────────────────────────────
  const handleDepBlur = async (cardId, person) => {
    setDepFocus(null)
    const k = `${cardId}_${person}`
    const raw = depEdit[k]
    if (raw === undefined) return
    await saveBenefitDeposit(cardId, person, parseAmt(raw))
    setDepEdit(p => { const n = { ...p }; delete n[k]; return n })
  }

  // ── add expense ──────────────────────────────────────────
  const handleAddExp = async () => {
    if (!form.amount || !form.cardId || !form.category) return
    setSaving(true)
    await saveBenefitExpense({
      id: genId(),
      cardId:      form.cardId,
      person:      form.person,
      category:    form.category,
      description: form.description.trim(),
      amount:      parseAmt(form.amount),
      date:        form.date || todayStr(),
    })
    setForm(p => ({ ...p, amount: '', description: '', date: todayStr() }))
    setSaving(false)
  }

  // ── category CRUD ────────────────────────────────────────
  const handleAddCat = async () => {
    if (!newCat.label.trim()) return
    const id = newCat.label.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    await saveBenefitCategories([...bCats, { id: `ben_${id}`, label: newCat.label.trim(), icon: newCat.icon, color: newCat.color }])
    setNewCat({ label: '', icon: '⭐', color: '#6366F1' })
  }

  const handleDelCat = async (catId) => {
    await saveBenefitCategories(bCats.filter(c => c.id !== catId))
  }

  // ── card CRUD ────────────────────────────────────────────
  const handleAddCard = async () => {
    if (!newCard.label.trim()) return
    const id = newCard.label.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    await saveBenefitCards([...bCards, { id, label: newCard.label.trim(), icon: newCard.icon, color: newCard.color }])
    setNewCard({ label: '', icon: '💳', color: '#6366F1' })
  }

  const handleDelCard = async (cardId) => {
    await saveBenefitCards(bCards.filter(c => c.id !== cardId))
  }

  // ── analytics ────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalDep   = bCards.reduce((a, c) => a + cardTotalDeposit(c.id), 0)
    const totalSpent = exps.reduce((a, e) => a + (e.amount || 0), 0)
    const balance    = totalDep - totalSpent

    const byCard = Object.fromEntries(bCards.map(c => [c.id, {
      deposited: cardTotalDeposit(c.id),
      spent:     cardTotalSpent(c.id),
    }]))

    const byPerson = Object.fromEntries(PERSONS.map(p => [p.id, {
      deposited: bCards.reduce((a, c) => a + getDeposit(c.id, p.id), 0),
      spent:     exps.filter(e => e.person === p.id).reduce((a, e) => a + e.amount, 0),
    }]))

    const byCat = Object.fromEntries(bCats.map(c => [c.id,
      exps.filter(e => e.category === c.id).reduce((a, e) => a + e.amount, 0)
    ]))
    const topCat = Object.entries(byCat).filter(([,v]) => v > 0).sort((a, b) => b[1] - a[1])[0]

    return { totalDep, totalSpent, balance, byCard, byPerson, byCat, topCat }
  }, [bCards, bCats, deps, exps])

  // ── filtered expenses ────────────────────────────────────
  const visibleExps = useMemo(() =>
    [...exps]
      .filter(e =>
        (fCard   === 'all' || e.cardId   === fCard)   &&
        (fPerson === 'all' || e.person   === fPerson) &&
        (fCat    === 'all' || e.category === fCat)
      )
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  , [exps, fCard, fPerson, fCat])

  const pillStyle = (active, color) => ({
    padding: '5px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
    border: active ? `2px solid ${color}` : '1.5px solid var(--border)',
    background: active ? color + '20' : 'var(--card)',
    color: active ? color : 'var(--text-secondary)',
  })

  // ── render ───────────────────────────────────────────────
  return (
    <div className="page-body">

      {/* ── Cabeçalho ── */}
      <div className="flex justify-between items-center mb-24" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 20 }}>Benefícios</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            Flash · Ticket · {monthLabel(currentMonth)}
          </div>
        </div>
        <div className="flex items-center gap-10" style={{ flexWrap: 'wrap' }}>
          <button onClick={() => setShowCatMgr(v => !v)} style={{ ...inputSt(false), cursor: 'pointer', fontWeight: 600 }}>
            + Categoria
          </button>
          <button onClick={() => setShowCardMgr(v => !v)} style={{ ...inputSt(false), cursor: 'pointer', fontWeight: 600 }}>
            + Cartão
          </button>
          <button
            onClick={() => { setShowForm(v => !v); setForm(defaultForm()) }}
            style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: 'var(--purple)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            + Registrar gasto
          </button>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid-4 mb-24">
        <div className="metric-card" style={{ background: stats.balance >= 0 ? 'var(--grad-green)' : 'var(--grad-red)' }}>
          <div className="metric-card-icon">💰</div>
          <div className="metric-card-label">Saldo Total</div>
          <div className="metric-card-value">{formatBRL(stats.balance)}</div>
          <div className="metric-card-sub">{stats.balance >= 0 ? 'No positivo' : 'Saldo negativo'}</div>
        </div>
        <div className="metric-card" style={{ background: 'var(--grad-primary)' }}>
          <div className="metric-card-icon">📥</div>
          <div className="metric-card-label">Total Depositado</div>
          <div className="metric-card-value">{formatBRL(stats.totalDep)}</div>
          <div className="metric-card-sub">{monthLabel(currentMonth)}</div>
        </div>
        <div className="metric-card" style={{ background: 'var(--grad-orange)' }}>
          <div className="metric-card-icon">📤</div>
          <div className="metric-card-label">Total Gasto</div>
          <div className="metric-card-value">{formatBRL(stats.totalSpent)}</div>
          <div className="metric-card-sub">{exps.length} lançamentos</div>
        </div>
        <div className="metric-card" style={{ background: 'var(--grad-blue)' }}>
          <div className="metric-card-icon">{stats.topCat ? catOf(stats.topCat[0]).icon : '🏷️'}</div>
          <div className="metric-card-label">Maior categoria</div>
          <div className="metric-card-value">{stats.topCat ? formatBRL(stats.topCat[1]) : '—'}</div>
          <div className="metric-card-sub">{stats.topCat ? catOf(stats.topCat[0]).label : 'Nenhum gasto'}</div>
        </div>
      </div>

      {/* ── Gerenciar categorias ── */}
      {showCatMgr && (
        <div className="card mb-16" style={{ border: '2px solid var(--border)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Categorias de benefício</div>
          <div className="flex items-center gap-8 mb-14" style={{ flexWrap: 'wrap' }}>
            {bCats.map(cat => (
              <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: cat.color + '20', border: `1.5px solid ${cat.color}40` }}>
                <span>{cat.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: cat.color }}>{cat.label}</span>
                <button onClick={() => handleDelCat(cat.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, padding: 0 }}>✕</button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-10" style={{ flexWrap: 'wrap' }}>
            <input type="text" placeholder="Nome da categoria" value={newCat.label} onChange={e => setNewCat(p => ({ ...p, label: e.target.value }))} style={{ ...inputSt(false), flex: 1, minWidth: 140 }} />
            <select value={newCat.icon} onChange={e => setNewCat(p => ({ ...p, icon: e.target.value }))} style={{ ...inputSt(false) }}>
              {ICON_OPTS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
            </select>
            <input type="color" value={newCat.color} onChange={e => setNewCat(p => ({ ...p, color: e.target.value }))} style={{ width: 40, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer', padding: 2 }} />
            <button onClick={handleAddCat} disabled={!newCat.label.trim()} style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: 'var(--purple)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: !newCat.label.trim() ? 0.5 : 1 }}>Adicionar</button>
            <button onClick={() => setShowCatMgr(false)} style={{ ...inputSt(false), cursor: 'pointer', fontWeight: 600, color: 'var(--text-secondary)' }}>Fechar</button>
          </div>
        </div>
      )}

      {/* ── Gerenciar cartões ── */}
      {showCardMgr && (
        <div className="card mb-16" style={{ border: '2px solid var(--border)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Cartões de benefício</div>
          <div className="flex items-center gap-8 mb-14" style={{ flexWrap: 'wrap' }}>
            {bCards.map(card => (
              <div key={card.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: card.color + '20', border: `1.5px solid ${card.color}40` }}>
                <span>{card.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: card.color }}>{card.label}</span>
                <button onClick={() => handleDelCard(card.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, padding: 0 }}>✕</button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-10" style={{ flexWrap: 'wrap' }}>
            <input type="text" placeholder="Nome do cartão (ex: Flash, Ticket)" value={newCard.label} onChange={e => setNewCard(p => ({ ...p, label: e.target.value }))} style={{ ...inputSt(false), flex: 1, minWidth: 160 }} />
            <select value={newCard.icon} onChange={e => setNewCard(p => ({ ...p, icon: e.target.value }))} style={{ ...inputSt(false) }}>
              {['💳','⚡','🎫','🏦','💴','💵','🎟️','🎪'].map(ic => <option key={ic} value={ic}>{ic}</option>)}
            </select>
            <input type="color" value={newCard.color} onChange={e => setNewCard(p => ({ ...p, color: e.target.value }))} style={{ width: 40, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer', padding: 2 }} />
            <button onClick={handleAddCard} disabled={!newCard.label.trim()} style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: 'var(--purple)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: !newCard.label.trim() ? 0.5 : 1 }}>Adicionar</button>
            <button onClick={() => setShowCardMgr(false)} style={{ ...inputSt(false), cursor: 'pointer', fontWeight: 600, color: 'var(--text-secondary)' }}>Fechar</button>
          </div>
        </div>
      )}

      {/* ── Depósitos por cartão ── */}
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Depósitos — {monthLabel(currentMonth)}</div>
      <div className="grid-2 gap-24 mb-24">
        {bCards.map(card => {
          const totalDep   = cardTotalDeposit(card.id)
          const totalSpent = cardTotalSpent(card.id)
          const balance    = totalDep - totalSpent

          return (
            <div key={card.id} className="card" style={{ borderTop: `4px solid ${card.color}` }}>
              {/* Header */}
              <div className="flex items-center justify-between mb-16">
                <div className="flex items-center gap-10">
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: card.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                    {card.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{card.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Cartão benefício</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: balance >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {formatBRL(balance)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>saldo</div>
                </div>
              </div>

              {/* Depósito por pessoa */}
              {PERSONS.map(person => {
                const dep   = getDeposit(card.id, person.id)
                const spent = personSpent(card.id, person.id)
                const bal   = dep - spent
                const pct   = dep > 0 ? Math.min((spent / dep) * 100, 100) : 0
                const fk    = `${card.id}_${person.id}`

                return (
                  <div key={person.id} style={{ padding: '12px 0', borderTop: '1px solid var(--border)' }}>
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-8">
                        <div className="avatar" style={{ background: person.color, width: 28, height: 28, fontSize: 11 }}>{person.avatar}</div>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{person.label}</span>
                      </div>
                      {/* Input de depósito */}
                      <div className="flex items-center gap-6">
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>R$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0"
                          value={getDepDisplay(card.id, person.id)}
                          onChange={e => setDepEdit(p => ({ ...p, [fk]: e.target.value }))}
                          onFocus={() => setDepFocus(fk)}
                          onBlur={() => handleDepBlur(card.id, person.id)}
                          style={{
                            width: 100, padding: '5px 8px',
                            border: `1.5px solid ${depFocus === fk ? 'var(--purple)' : 'var(--border)'}`,
                            borderRadius: 6, fontSize: 13, fontWeight: 700, textAlign: 'right',
                            background: 'var(--card)', color: 'var(--text-primary)', outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    {/* Progress gasto/depósito */}
                    <div className="flex justify-between items-center mb-4">
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Gasto: {formatBRL(spent)}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: bal >= 0 ? 'var(--green)' : 'var(--red)' }}>
                        Saldo: {formatBRL(bal)}
                      </span>
                    </div>
                    {dep > 0 && (
                      <div className="progress-bar-wrap" style={{ height: 5 }}>
                        <div className="progress-bar-fill" style={{ width: `${pct}%`, background: pct > 90 ? 'var(--red)' : card.color }} />
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Rodapé */}
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Depositado: <strong>{formatBRL(totalDep)}</strong></span>
                <span style={{ color: 'var(--text-secondary)' }}>Gasto: <strong style={{ color: totalSpent > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>{formatBRL(totalSpent)}</strong></span>
              </div>
            </div>
          )
        })}

        {bCards.length === 0 && (
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="empty-state">
              <div className="empty-state-icon">💳</div>
              <div className="empty-state-text">Nenhum cartão cadastrado.<br />Clique em <strong>+ Cartão</strong> para adicionar.</div>
            </div>
          </div>
        )}
      </div>

      {/* ── Formulário de gasto ── */}
      {showForm && (
        <div className="card mb-20" style={{ border: '2px solid var(--purple)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Registrar gasto</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
            {/* Cartão */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Cartão</div>
              <select value={form.cardId} onChange={e => setForm(p => ({ ...p, cardId: e.target.value }))} style={{ ...inputSt(false), width: '100%' }}>
                {bCards.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
            </div>
            {/* Responsável */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Responsável</div>
              <select value={form.person} onChange={e => setForm(p => ({ ...p, person: e.target.value }))} style={{ ...inputSt(false), width: '100%' }}>
                {PERSONS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            {/* Categoria */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Categoria</div>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={{ ...inputSt(false), width: '100%' }}>
                <option value="">Selecionar…</option>
                {bCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
            </div>
            {/* Valor */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Valor (R$)</div>
              <input
                type="text" inputMode="decimal" placeholder="0,00"
                value={form.amount}
                onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleAddExp()}
                style={{ ...inputSt(false), width: '100%' }}
              />
            </div>
            {/* Data */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Data</div>
              <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} style={{ ...inputSt(false), width: '100%' }} />
            </div>
            {/* Descrição */}
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Descrição (opcional)</div>
              <input type="text" placeholder="Ex: Posto Shell, Extra, Mercadinho…" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} style={{ ...inputSt(false), width: '100%' }} />
            </div>
          </div>
          <div className="flex items-center gap-10 mt-14" style={{ flexWrap: 'wrap' }}>
            <button
              onClick={handleAddExp}
              disabled={saving || !form.amount || !form.cardId || !form.category}
              style={{ padding: '8px 22px', borderRadius: 8, border: 'none', background: 'var(--purple)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: (!form.amount || !form.cardId || !form.category) ? 0.5 : 1 }}
            >
              {saving ? 'Salvando…' : 'Registrar gasto'}
            </button>
            <button onClick={() => setShowForm(false)} style={{ ...inputSt(false), cursor: 'pointer', fontWeight: 600, color: 'var(--text-secondary)' }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* ── Dashboard ── */}
      <div className="grid-2 gap-24 mb-24">
        {/* Por cartão */}
        <div className="card">
          <div className="section-title">💳 Por Cartão</div>
          {bCards.map(card => {
            const d = stats.byCard[card.id] || { deposited: 0, spent: 0 }
            const pct = d.deposited > 0 ? Math.min((d.spent / d.deposited) * 100, 100) : 0
            return (
              <div key={card.id} style={{ marginBottom: 14 }}>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-6">
                    <span style={{ fontSize: 15 }}>{card.icon}</span>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{card.label}</span>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 12 }}>
                    <span style={{ fontWeight: 700 }}>{formatBRL(d.spent)}</span>
                    <span style={{ color: 'var(--text-muted)' }}> / {formatBRL(d.deposited)}</span>
                  </div>
                </div>
                <div className="progress-bar-wrap" style={{ height: 8 }}>
                  <div className="progress-bar-fill" style={{ width: `${pct}%`, background: card.color }} />
                </div>
                <div style={{ fontSize: 11, color: (d.deposited - d.spent) >= 0 ? 'var(--green)' : 'var(--red)', marginTop: 4, textAlign: 'right', fontWeight: 600 }}>
                  Saldo: {formatBRL(d.deposited - d.spent)}
                </div>
              </div>
            )
          })}

          {/* Por pessoa */}
          <div style={{ paddingTop: 14, borderTop: '1px solid var(--border)', marginTop: 4 }}>
            <div className="section-title" style={{ marginBottom: 10 }}>👥 Por Responsável</div>
            {PERSONS.map(p => {
              const d = stats.byPerson[p.id] || { deposited: 0, spent: 0 }
              const pct = d.deposited > 0 ? Math.min((d.spent / d.deposited) * 100, 100) : 0
              return (
                <div key={p.id} style={{ marginBottom: 12 }}>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-6">
                      <div className="avatar" style={{ background: p.color, width: 22, height: 22, fontSize: 10 }}>{p.avatar}</div>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{p.label}</span>
                    </div>
                    <div style={{ fontSize: 12 }}>
                      <span style={{ fontWeight: 700 }}>{formatBRL(d.spent)}</span>
                      <span style={{ color: 'var(--text-muted)' }}> / {formatBRL(d.deposited)}</span>
                    </div>
                  </div>
                  <div className="progress-bar-wrap" style={{ height: 6 }}>
                    <div className="progress-bar-fill" style={{ width: `${pct}%`, background: p.color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Por categoria */}
        <div className="card">
          <div className="section-title">🏷️ Por Categoria</div>
          {bCats.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Nenhuma categoria.</div>}
          {bCats
            .map(cat => ({ cat, val: stats.byCat[cat.id] || 0 }))
            .sort((a, b) => b.val - a.val)
            .map(({ cat, val }) => {
              const pct = stats.totalSpent > 0 ? (val / stats.totalSpent) * 100 : 0
              return (
                <div key={cat.id} style={{ marginBottom: 12 }}>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-6">
                      <span style={{ fontSize: 15 }}>{cat.icon}</span>
                      <span style={{ fontWeight: 500, fontSize: 13 }}>{cat.label}</span>
                    </div>
                    <div style={{ fontSize: 12 }}>
                      <span style={{ fontWeight: 700 }}>{formatBRL(val)}</span>
                      {val > 0 && <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>{pct.toFixed(0)}%</span>}
                    </div>
                  </div>
                  <div className="progress-bar-wrap" style={{ height: 6 }}>
                    <div className="progress-bar-fill" style={{ width: `${pct}%`, background: cat.color }} />
                  </div>
                </div>
              )
            })}
          {exps.length === 0 && bCats.length > 0 && (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>Nenhum gasto registrado ainda.</div>
          )}
        </div>
      </div>

      {/* ── Lista de gastos ── */}
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>
        Gastos — {monthLabel(currentMonth)}
        {exps.length > 0 && <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>{visibleExps.length} de {exps.length} lançamentos</span>}
      </div>

      {/* Filtros */}
      {exps.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          <button onClick={() => setFCard('all')} style={pillStyle(fCard === 'all', 'var(--purple)')}>Todos os cartões</button>
          {bCards.map(c => (
            <button key={c.id} onClick={() => setFCard(fCard === c.id ? 'all' : c.id)} style={pillStyle(fCard === c.id, c.color)}>
              {c.icon} {c.label}
            </button>
          ))}
          <span style={{ borderLeft: '1px solid var(--border)', margin: '0 4px' }} />
          <button onClick={() => setFPerson('all')} style={pillStyle(fPerson === 'all', 'var(--purple)')}>Todos</button>
          {PERSONS.map(p => (
            <button key={p.id} onClick={() => setFPerson(fPerson === p.id ? 'all' : p.id)} style={pillStyle(fPerson === p.id, p.color)}>
              {p.label}
            </button>
          ))}
          <span style={{ borderLeft: '1px solid var(--border)', margin: '0 4px' }} />
          {bCats.filter(c => (stats.byCat[c.id] || 0) > 0).map(c => (
            <button key={c.id} onClick={() => setFCat(fCat === c.id ? 'all' : c.id)} style={pillStyle(fCat === c.id, c.color)}>
              {c.icon} {c.label}
            </button>
          ))}
        </div>
      )}

      {exps.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📤</div>
            <div className="empty-state-text">Nenhum gasto registrado em {monthLabel(currentMonth)}.<br />Clique em <strong>+ Registrar gasto</strong> para começar.</div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg)', borderBottom: '2px solid var(--border)' }}>
                {['Data','Cartão','Responsável','Categoria','Descrição','Valor',''].map((h, i) => (
                  <th key={i} style={{ padding: '10px 14px', textAlign: i >= 5 ? 'right' : 'left', fontWeight: 700, fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleExps.map((exp, idx) => {
                const card   = cardOf(exp.cardId)
                const cat    = catOf(exp.category)
                const person = PERSONS.find(p => p.id === exp.person) || PERSONS[0]

                return (
                  <tr key={exp.id} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'var(--card)' : 'var(--bg)' }}>
                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {exp.date ? new Date(exp.date + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 12, background: card.color + '20', fontSize: 11, fontWeight: 600, color: card.color }}>
                        {card.icon} {card.label}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className={`badge ${person.badge}`} style={{ fontSize: 10 }}>{person.label}</span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 12, background: cat.color + '20', fontSize: 11, fontWeight: 600, color: cat.color }}>
                        {cat.icon} {cat.label}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontSize: 12 }}>
                      {exp.description || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {formatBRL(exp.amount)}
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'right' }}>
                      {confirmDel === exp.id ? (
                        <div className="flex items-center gap-4" style={{ justifyContent: 'flex-end' }}>
                          <button onClick={() => deleteBenefitExpense(exp.id).then(() => setConfirmDel(null))} style={{ padding: '3px 8px', borderRadius: 6, border: 'none', background: 'var(--red)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Confirmar</button>
                          <button onClick={() => setConfirmDel(null)} style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer' }}>✕</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDel(exp.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-muted)', padding: 4 }} title="Excluir">🗑</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--bg)', borderTop: '2px solid var(--border)' }}>
                <td colSpan={5} style={{ padding: '10px 14px', fontWeight: 700, fontSize: 12, color: 'var(--text-secondary)' }}>
                  Total ({visibleExps.length} lançamentos)
                </td>
                <td style={{ padding: '10px 14px', fontWeight: 800, fontSize: 14, textAlign: 'right', color: 'var(--purple)' }}>
                  {formatBRL(visibleExps.reduce((a, e) => a + (e.amount || 0), 0))}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
