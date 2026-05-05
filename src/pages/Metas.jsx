import { useState } from 'react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { useFinance } from '../contexts/FinanceContext'
import { formatBRL, formatPct, monthLabel } from '../utils/calculations'

const parseAmt = (str) => parseFloat(String(str).replace(',', '.')) || 0

const PERSONS = [
  { id: 'tereza',    label: 'Tereza',    color: 'var(--pink)',   avatar: 'T', grad: 'var(--grad-red)' },
  { id: 'sebastiao', label: 'Sebastião', color: 'var(--purple)', avatar: 'S', grad: 'var(--grad-blue)' },
]

export default function Metas() {
  const {
    config, saveConfig, computedData,
    monthData, currentMonth, saveInvestmentData,
    GENERAL_CATEGORIES,
  } = useFinance()

  const [activePerson, setActivePerson] = useState('tereza')
  const [editing, setEditing]           = useState(false)
  const [draftGoals, setDraftGoals]     = useState(null)

  // ── investment edit state ──────────────────────────────
  const [invEdit, setInvEdit]   = useState({}) // `${person}_portfolio` | `${person}_monthly`
  const [invFocus, setInvFocus] = useState(null)

  const data      = computedData()
  const goals     = config.goals || {}
  const invList   = monthData.investments || []

  // ── investment helpers ─────────────────────────────────
  const getInvData = (person) =>
    invList.find(i => i.person === person) || { portfolioValue: 0, monthlyAmount: 0 }

  const getInvDisplay = (person, field) => {
    const k = `${person}_${field}`
    if (invEdit[k] !== undefined) return invEdit[k]
    const v = getInvData(person)[field]
    return v > 0 ? String(v) : ''
  }

  const handleInvBlur = async (person, field) => {
    setInvFocus(null)
    const k = `${person}_${field}`
    const raw = invEdit[k]
    if (raw === undefined) return
    const val = parseAmt(raw)
    const cur = getInvData(person)
    const pv  = field === 'portfolioValue' ? val : (cur.portfolioValue || 0)
    const ma  = field === 'monthlyAmount'  ? val : (cur.monthlyAmount  || 0)
    await saveInvestmentData(person, pv, ma)
    setInvEdit(p => { const n = { ...p }; delete n[k]; return n })
  }

  const inputSt = (focused) => ({
    padding: '7px 10px',
    border: `1.5px solid ${focused ? 'var(--purple)' : 'var(--border)'}`,
    borderRadius: 7, fontSize: 14, fontWeight: 700,
    background: 'var(--card)', color: 'var(--text-primary)',
    outline: 'none', textAlign: 'right', width: '100%',
    transition: 'border-color .15s',
  })

  // ── totals ─────────────────────────────────────────────
  const tPortfolio = PERSONS.reduce((a, p) => a + (getInvData(p.id).portfolioValue || 0), 0)
  const tMonthly   = PERSONS.reduce((a, p) => a + (getInvData(p.id).monthlyAmount  || 0), 0)

  // ── goals helpers ──────────────────────────────────────
  const personGoals   = goals[activePerson] || {}
  const totalIncome   = data.totalIncome[activePerson] || 0
  const totalGoalPct  = Object.values(draftGoals || personGoals).reduce((a, v) => a + (parseFloat(v) || 0), 0)

  const startEdit = () => { setDraftGoals({ ...personGoals }); setEditing(true) }
  const saveGoals = async () => {
    await saveConfig({ goals: { ...goals, [activePerson]: draftGoals } })
    setEditing(false); setDraftGoals(null)
  }

  // ── radar data ─────────────────────────────────────────
  const radarData = GENERAL_CATEGORIES.map(cat => {
    const goalPct  = personGoals[cat.id] || 0
    const spentAmt = (data.byCategory[cat.id]?.[activePerson] || 0) +
      (activePerson === 'tereza'
        ? (config.fixedBills||[]).filter(b=>(b.person==='tereza'||b.person==='both')&&b.category===cat.id).reduce((a,b)=>a+b.amount/((b.person==='both')?2:1),0)
        : (config.fixedBills||[]).filter(b=>(b.person==='sebastiao'||b.person==='both')&&b.category===cat.id).reduce((a,b)=>a+b.amount/((b.person==='both')?2:1),0))
    const spentPct = totalIncome > 0 ? (spentAmt / totalIncome) * 100 : 0
    return { subject: cat.label.split(' ')[0], meta: goalPct, gasto: parseFloat(spentPct.toFixed(1)) }
  })

  // ── investment goal amounts ────────────────────────────
  const invGoalPct    = personGoals.investimentos || 0
  const invViagemPct  = personGoals.inv_viagem    || 0
  const invGoalAmt    = totalIncome * (invGoalPct   / 100)
  const invViagemAmt  = totalIncome * (invViagemPct / 100)
  const invActualAmt  = data.byCategory.investimentos?.[activePerson] || 0
  const invVActualAmt = data.byCategory.inv_viagem?.[activePerson]    || 0

  return (
    <div className="page-body">

      {/* ══════════════════════════════════════════════════
          SEÇÃO — CARTEIRA DE INVESTIMENTOS
      ══════════════════════════════════════════════════ */}
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6 }}>💼 Carteira de Investimentos</div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20 }}>
        Informe o saldo atual e o valor investido neste mês — {monthLabel(currentMonth)}
      </div>

      {/* KPI cards */}
      <div className="grid-4 mb-24">
        <div className="metric-card" style={{ background: 'var(--grad-green)' }}>
          <div className="metric-card-icon">📈</div>
          <div className="metric-card-label">Carteira Total</div>
          <div className="metric-card-value">{formatBRL(tPortfolio)}</div>
          <div className="metric-card-sub">Tereza + Sebastião</div>
        </div>
        {PERSONS.map(p => {
          const inv = getInvData(p.id)
          return (
            <div key={p.id} className="metric-card" style={{ background: p.grad }}>
              <div className="metric-card-icon">{p.avatar}</div>
              <div className="metric-card-label">{p.label}</div>
              <div className="metric-card-value">{formatBRL(inv.portfolioValue || 0)}</div>
              <div className="metric-card-sub">
                {inv.monthlyAmount > 0 ? `+${formatBRL(inv.monthlyAmount)} este mês` : 'Sem aporte'}
              </div>
            </div>
          )
        })}
        <div className="metric-card" style={{ background: 'var(--grad-primary)' }}>
          <div className="metric-card-icon">💰</div>
          <div className="metric-card-label">Aportado no Mês</div>
          <div className="metric-card-value">{formatBRL(tMonthly)}</div>
          <div className="metric-card-sub">{monthLabel(currentMonth)}</div>
        </div>
      </div>

      {/* Cards de lançamento por pessoa */}
      <div className="grid-2 gap-24 mb-32">
        {PERSONS.map(p => {
          const inv        = getInvData(p.id)
          const fkPort     = `${p.id}_portfolioValue`
          const fkMonthly  = `${p.id}_monthlyAmount`
          const goalPct    = (goals[p.id]?.investimentos || 0) + (goals[p.id]?.inv_viagem || 0)
          const income     = data.totalIncome[p.id] || 0
          const goalAmt    = income * (goalPct / 100)
          const monthly    = inv.monthlyAmount || 0
          const pct        = goalAmt > 0 ? Math.min((monthly / goalAmt) * 100, 100) : 0
          const over       = goalAmt > 0 && monthly > goalAmt

          return (
            <div key={p.id} className="card" style={{ borderTop: `4px solid ${p.color}` }}>
              {/* Header */}
              <div className="flex items-center gap-10 mb-20">
                <div className="avatar" style={{ background: p.color, width: 40, height: 40, fontSize: 16 }}>{p.avatar}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{p.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Renda: {income > 0 ? formatBRL(income) : 'não informada'}
                  </div>
                </div>
              </div>

              {/* Saldo da carteira */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Saldo atual da carteira
                </div>
                <div className="flex items-center gap-6">
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={getInvDisplay(p.id, 'portfolioValue')}
                    onChange={e => setInvEdit(prev => ({ ...prev, [fkPort]: e.target.value }))}
                    onFocus={() => setInvFocus(fkPort)}
                    onBlur={() => handleInvBlur(p.id, 'portfolioValue')}
                    style={inputSt(invFocus === fkPort)}
                  />
                </div>
                {inv.updatedAt && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    Atualizado em {new Date(inv.updatedAt).toLocaleDateString('pt-BR')}
                  </div>
                )}
              </div>

              {/* Valor investido no mês */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Valor investido este mês
                </div>
                <div className="flex items-center gap-6">
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={getInvDisplay(p.id, 'monthlyAmount')}
                    onChange={e => setInvEdit(prev => ({ ...prev, [fkMonthly]: e.target.value }))}
                    onFocus={() => setInvFocus(fkMonthly)}
                    onBlur={() => handleInvBlur(p.id, 'monthlyAmount')}
                    style={inputSt(invFocus === fkMonthly)}
                  />
                </div>
              </div>

              {/* Meta vs aportado */}
              {goalAmt > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-5" style={{ fontSize: 12 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      Meta: {formatBRL(goalAmt)} ({goalPct}% da renda)
                    </span>
                    <span style={{ fontWeight: 700, color: over ? 'var(--green)' : pct >= 80 ? 'var(--orange)' : 'var(--text-secondary)' }}>
                      {pct.toFixed(0)}%
                      {over && ' ✓'}
                    </span>
                  </div>
                  <div className="progress-bar-wrap" style={{ height: 7 }}>
                    <div className="progress-bar-fill" style={{
                      width: `${pct}%`,
                      background: over ? 'var(--green)' : p.color,
                    }} />
                  </div>
                </div>
              )}

              {/* Totais do card */}
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Carteira: <strong style={{ color: 'var(--text-primary)', fontSize: 13 }}>{formatBRL(inv.portfolioValue || 0)}</strong>
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Aporte: <strong style={{ color: monthly > 0 ? 'var(--green)' : 'var(--text-muted)', fontSize: 13 }}>{monthly > 0 ? `+${formatBRL(monthly)}` : '—'}</strong>
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Resumo consolidado */}
      <div className="card mb-32">
        <div className="section-title">📊 Resumo Consolidado — {monthLabel(currentMonth)}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginTop: 4 }}>
          {[
            { label: 'Carteira Tereza',    value: getInvData('tereza').portfolioValue    || 0, color: 'var(--pink)',   pct: tPortfolio > 0 ? ((getInvData('tereza').portfolioValue||0)/tPortfolio)*100 : 0 },
            { label: 'Carteira Sebastião', value: getInvData('sebastiao').portfolioValue || 0, color: 'var(--purple)', pct: tPortfolio > 0 ? ((getInvData('sebastiao').portfolioValue||0)/tPortfolio)*100 : 0 },
            { label: 'Aporte Tereza',      value: getInvData('tereza').monthlyAmount     || 0, color: 'var(--pink)',   pct: tMonthly > 0 ? ((getInvData('tereza').monthlyAmount||0)/tMonthly)*100 : 0 },
            { label: 'Aporte Sebastião',   value: getInvData('sebastiao').monthlyAmount  || 0, color: 'var(--purple)', pct: tMonthly > 0 ? ((getInvData('sebastiao').monthlyAmount||0)/tMonthly)*100 : 0 },
          ].map(item => (
            <div key={item.label}>
              <div className="flex justify-between items-center mb-5">
                <span style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{formatBRL(item.value)}</span>
              </div>
              <div className="progress-bar-wrap" style={{ height: 6 }}>
                <div className="progress-bar-fill" style={{ width: `${item.pct}%`, background: item.color }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>Total geral da carteira</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{formatBRL(tPortfolio)}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Total aportado este mês</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: tMonthly > 0 ? 'var(--green)' : 'var(--text-muted)' }}>
            {tMonthly > 0 ? `+${formatBRL(tMonthly)}` : '—'}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          SEÇÃO — METAS POR CATEGORIA (existente)
      ══════════════════════════════════════════════════ */}
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 20 }}>🎯 Metas por Categoria</div>

      {/* Person toggle */}
      <div className="flex gap-12 mb-24">
        {PERSONS.map(p => (
          <button
            key={p.id}
            className={`btn btn-lg ${activePerson === p.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActivePerson(p.id)}
          >
            <div className="avatar" style={{ background: p.color, width: 24, height: 24, fontSize: 11 }}>{p.avatar}</div>
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid-2 mb-24">
        {/* Investimentos vs Meta */}
        <div className="card card-lg">
          <div className="section-title">📈 Investimentos Geral</div>
          <div className="metric-card mb-16" style={{ background: 'var(--grad-green)' }}>
            <div className="metric-card-label">Meta mensal</div>
            <div className="metric-card-value">{formatBRL(invGoalAmt)}</div>
            <div className="metric-card-sub">{invGoalPct}% da renda · Investido: {formatBRL(invActualAmt)}</div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <div className="flex justify-between" style={{ fontSize: 12, marginBottom: 4 }}>
              <span>Progresso</span>
              <span style={{ fontWeight: 600, color: invActualAmt >= invGoalAmt ? 'var(--green)' : 'var(--orange)' }}>
                {invGoalAmt > 0 ? formatPct((invActualAmt / invGoalAmt) * 100) : '0%'}
              </span>
            </div>
            <div className="progress-bar-wrap" style={{ height: 8 }}>
              <div className="progress-bar-fill" style={{ width: `${Math.min(invGoalAmt > 0 ? (invActualAmt / invGoalAmt) * 100 : 0, 100)}%`, background: 'var(--grad-green)' }} />
            </div>
          </div>

          <div className="section-title mt-16">✈️ Investimentos Viagem</div>
          <div className="metric-card mb-16" style={{ background: 'var(--grad-blue)' }}>
            <div className="metric-card-label">Meta mensal</div>
            <div className="metric-card-value">{formatBRL(invViagemAmt)}</div>
            <div className="metric-card-sub">{invViagemPct}% da renda · Investido: {formatBRL(invVActualAmt)}</div>
          </div>
          <div>
            <div className="flex justify-between" style={{ fontSize: 12, marginBottom: 4 }}>
              <span>Progresso</span>
              <span style={{ fontWeight: 600, color: invVActualAmt >= invViagemAmt ? 'var(--green)' : 'var(--orange)' }}>
                {invViagemAmt > 0 ? formatPct((invVActualAmt / invViagemAmt) * 100) : '0%'}
              </span>
            </div>
            <div className="progress-bar-wrap" style={{ height: 8 }}>
              <div className="progress-bar-fill" style={{ width: `${Math.min(invViagemAmt > 0 ? (invVActualAmt / invViagemAmt) * 100 : 0, 100)}%`, background: 'var(--grad-blue)' }} />
            </div>
          </div>
        </div>

        {/* Radar */}
        <div className="card card-lg">
          <div className="section-title">🎯 Radar — Meta vs Gasto Real (%)</div>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
              <Radar name="Meta"  dataKey="meta"  stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.2} />
              <Radar name="Gasto" dataKey="gasto" stroke="#EC4899" fill="#EC4899" fillOpacity={0.2} />
              <Tooltip formatter={(v) => `${v}%`} />
            </RadarChart>
          </ResponsiveContainer>
          <div className="flex gap-16" style={{ justifyContent: 'center', fontSize: 12 }}>
            <div className="flex items-center gap-4"><div style={{ width: 10, height: 10, borderRadius: 2, background: '#8B5CF6' }} /> Meta</div>
            <div className="flex items-center gap-4"><div style={{ width: 10, height: 10, borderRadius: 2, background: '#EC4899' }} /> Gasto</div>
          </div>
        </div>
      </div>

      {/* Metas por categoria */}
      <div className="card">
        <div className="flex justify-between items-center mb-20">
          <div className="section-title" style={{ marginBottom: 0 }}>
            🎯 Metas por Categoria
            <small> — {activePerson === 'tereza' ? 'Tereza' : 'Sebastião'}</small>
          </div>
          {editing ? (
            <div className="flex gap-8">
              <span style={{ fontSize: 12, color: totalGoalPct > 100 ? 'var(--red)' : 'var(--text-secondary)', alignSelf: 'center' }}>
                Total: {totalGoalPct.toFixed(0)}%{totalGoalPct > 100 && ' ⚠️ ultrapassa 100%'}
              </span>
              <button className="btn btn-primary btn-sm" onClick={saveGoals}>Salvar</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancelar</button>
            </div>
          ) : (
            <button className="btn btn-secondary btn-sm" onClick={startEdit}>✏️ Editar Metas</button>
          )}
        </div>

        {GENERAL_CATEGORIES.map(cat => {
          const goalPct  = editing ? (draftGoals?.[cat.id] || 0) : (personGoals[cat.id] || 0)
          const goalAmt  = totalIncome * (goalPct / 100)
          const spentAmt = data.byCategory[cat.id]?.[activePerson] || 0
          const pct      = goalAmt > 0 ? Math.min((spentAmt / goalAmt) * 100, 100) : 0
          const over     = spentAmt > goalAmt && goalAmt > 0

          return (
            <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid var(--border)' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: cat.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
                {cat.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="flex justify-between items-center" style={{ marginBottom: 5 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{cat.label}</span>
                  <div className="flex items-center gap-8">
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {formatBRL(spentAmt)} / {formatBRL(goalAmt)}
                    </span>
                    {over && <span className="badge badge-red">acima da meta</span>}
                    {!over && spentAmt > 0 && <span className="badge badge-green">✓</span>}
                  </div>
                </div>
                <div className="progress-bar-wrap">
                  <div className="progress-bar-fill" style={{ width: `${pct}%`, background: over ? 'var(--red)' : cat.color }} />
                </div>
              </div>
              {editing ? (
                <div className="flex items-center gap-4" style={{ width: 80 }}>
                  <input
                    type="number" min="0" max="100" step="1"
                    value={draftGoals?.[cat.id] || ''}
                    placeholder="0"
                    onChange={e => setDraftGoals(prev => ({ ...prev, [cat.id]: parseFloat(e.target.value) || 0 }))}
                    style={{ width: 52, padding: '4px 8px', border: '1.5px solid var(--border)', borderRadius: 6, fontSize: 13, textAlign: 'center' }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>%</span>
                </div>
              ) : (
                <div style={{ width: 52, textAlign: 'right', fontWeight: 700, fontSize: 14, color: cat.color }}>
                  {goalPct}%
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
