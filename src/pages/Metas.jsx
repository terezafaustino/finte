import { useState } from 'react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { useFinance } from '../contexts/FinanceContext'
import { formatBRL, formatPct } from '../utils/calculations'

export default function Metas() {
  const { config, saveConfig, computedData, GENERAL_CATEGORIES } = useFinance()
  const [activePerson, setActivePerson] = useState('tereza')
  const [editing, setEditing] = useState(false)
  const [draftGoals, setDraftGoals] = useState(null)

  const data = computedData()
  const goals = config.goals || {}
  const personGoals = goals[activePerson] || {}
  const totalIncome = data.totalIncome[activePerson] || 0

  const startEdit = () => {
    setDraftGoals({ ...personGoals })
    setEditing(true)
  }

  const saveGoals = async () => {
    const newGoals = { ...goals, [activePerson]: draftGoals }
    await saveConfig({ goals: newGoals })
    setEditing(false)
    setDraftGoals(null)
  }

  const totalGoalPct = Object.values(draftGoals || personGoals).reduce((a, v) => a + (parseFloat(v)||0), 0)

  // Dados para radar
  const radarData = GENERAL_CATEGORIES.map(cat => {
    const goalPct = personGoals[cat.id] || 0
    const spentAmt = (data.byCategory[cat.id]?.[activePerson] || 0) +
      (activePerson === 'tereza'
        ? (config.fixedBills||[]).filter(b=>(b.person==='tereza'||b.person==='both')&&b.category===cat.id).reduce((a,b)=>a+b.amount/((b.person==='both')?2:1),0)
        : (config.fixedBills||[]).filter(b=>(b.person==='sebastiao'||b.person==='both')&&b.category===cat.id).reduce((a,b)=>a+b.amount/((b.person==='both')?2:1),0))
    const spentPct = totalIncome > 0 ? (spentAmt/totalIncome)*100 : 0
    return { subject: cat.label.split(' ')[0], meta: goalPct, gasto: parseFloat(spentPct.toFixed(1)) }
  })

  // Investimentos — cards especiais
  const invGoalPct    = personGoals.investimentos || 0
  const invViagemPct  = personGoals.inv_viagem    || 0
  const invGoalAmt    = totalIncome * (invGoalPct/100)
  const invViagemAmt  = totalIncome * (invViagemPct/100)
  const invActualAmt  = data.byCategory.investimentos?.[activePerson] || 0
  const invVActualAmt = data.byCategory.inv_viagem?.[activePerson]    || 0

  return (
    <div className="page-body">

      {/* ── Person toggle ── */}
      <div className="flex gap-12 mb-24">
        <button
          className={`btn btn-lg ${activePerson==='tereza' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActivePerson('tereza')}
        >
          <div className="avatar" style={{ background:'var(--pink)', width:24, height:24, fontSize:11 }}>T</div>
          Tereza
        </button>
        <button
          className={`btn btn-lg ${activePerson==='sebastiao' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActivePerson('sebastiao')}
        >
          <div className="avatar" style={{ background:'var(--purple)', width:24, height:24, fontSize:11 }}>S</div>
          Sebastião
        </button>
      </div>

      <div className="grid-2 mb-24">

        {/* ── Investimentos ── */}
        <div className="card card-lg">
          <div className="section-title">📈 Investimentos Geral</div>

          <div className="metric-card mb-16" style={{ background:'var(--grad-green)' }}>
            <div className="metric-card-label">Meta mensal</div>
            <div className="metric-card-value">{formatBRL(invGoalAmt)}</div>
            <div className="metric-card-sub">{invGoalPct}% da renda · Investido: {formatBRL(invActualAmt)}</div>
          </div>

          <div style={{ marginBottom:8 }}>
            <div className="flex justify-between" style={{ fontSize:12, marginBottom:4 }}>
              <span>Progresso</span>
              <span style={{ fontWeight:600, color: invActualAmt >= invGoalAmt ? 'var(--green)' : 'var(--orange)' }}>
                {invGoalAmt > 0 ? formatPct((invActualAmt/invGoalAmt)*100) : '0%'}
              </span>
            </div>
            <div className="progress-bar-wrap" style={{ height:8 }}>
              <div className="progress-bar-fill" style={{ width:`${Math.min(invGoalAmt>0?(invActualAmt/invGoalAmt)*100:0,100)}%`, background:'var(--grad-green)' }} />
            </div>
          </div>

          <div className="section-title mt-16">✈️ Investimentos Viagem</div>
          <div className="metric-card mb-16" style={{ background:'var(--grad-blue)' }}>
            <div className="metric-card-label">Meta mensal</div>
            <div className="metric-card-value">{formatBRL(invViagemAmt)}</div>
            <div className="metric-card-sub">{invViagemPct}% da renda · Investido: {formatBRL(invVActualAmt)}</div>
          </div>

          <div>
            <div className="flex justify-between" style={{ fontSize:12, marginBottom:4 }}>
              <span>Progresso</span>
              <span style={{ fontWeight:600, color: invVActualAmt >= invViagemAmt ? 'var(--green)' : 'var(--orange)' }}>
                {invViagemAmt > 0 ? formatPct((invVActualAmt/invViagemAmt)*100) : '0%'}
              </span>
            </div>
            <div className="progress-bar-wrap" style={{ height:8 }}>
              <div className="progress-bar-fill" style={{ width:`${Math.min(invViagemAmt>0?(invVActualAmt/invViagemAmt)*100:0,100)}%`, background:'var(--grad-blue)' }} />
            </div>
          </div>
        </div>

        {/* ── Radar ── */}
        <div className="card card-lg">
          <div className="section-title">🎯 Radar — Meta vs Gasto Real (%)</div>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize:10 }} />
              <Radar name="Meta" dataKey="meta" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.2} />
              <Radar name="Gasto" dataKey="gasto" stroke="#EC4899" fill="#EC4899" fillOpacity={0.2} />
              <Tooltip formatter={(v) => `${v}%`} />
            </RadarChart>
          </ResponsiveContainer>
          <div className="flex gap-16" style={{ justifyContent:'center', fontSize:12 }}>
            <div className="flex items-center gap-4"><div style={{ width:10, height:10, borderRadius:2, background:'#8B5CF6' }}/> Meta</div>
            <div className="flex items-center gap-4"><div style={{ width:10, height:10, borderRadius:2, background:'#EC4899' }}/> Gasto</div>
          </div>
        </div>
      </div>

      {/* ── Metas por categoria ── */}
      <div className="card">
        <div className="flex justify-between items-center mb-20">
          <div className="section-title" style={{ marginBottom:0 }}>
            🎯 Metas por Categoria
            <small> — {activePerson === 'tereza' ? 'Tereza' : 'Sebastião'}</small>
          </div>
          {editing ? (
            <div className="flex gap-8">
              <span style={{ fontSize:12, color: totalGoalPct > 100 ? 'var(--red)' : 'var(--text-secondary)', alignSelf:'center' }}>
                Total: {totalGoalPct.toFixed(0)}%
                {totalGoalPct > 100 && ' ⚠️ ultrapassa 100%'}
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
          const goalAmt  = totalIncome * (goalPct/100)
          const spentAmt = (data.byCategory[cat.id]?.[activePerson] || 0)
          const pct      = goalAmt > 0 ? Math.min((spentAmt/goalAmt)*100, 100) : 0
          const over     = spentAmt > goalAmt && goalAmt > 0

          return (
            <div key={cat.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderTop:'1px solid var(--border)' }}>
              <div style={{ width:32, height:32, borderRadius:8, background:cat.color+'20', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>
                {cat.icon}
              </div>

              <div style={{ flex:1, minWidth:0 }}>
                <div className="flex justify-between items-center" style={{ marginBottom:5 }}>
                  <span style={{ fontWeight:600, fontSize:13 }}>{cat.label}</span>
                  <div className="flex items-center gap-8">
                    <span style={{ fontSize:12, color:'var(--text-secondary)' }}>
                      {formatBRL(spentAmt)} / {formatBRL(goalAmt)}
                    </span>
                    {over && <span className="badge badge-red">acima da meta</span>}
                    {!over && spentAmt > 0 && <span className="badge badge-green">✓</span>}
                  </div>
                </div>
                <div className="progress-bar-wrap">
                  <div className="progress-bar-fill" style={{
                    width:`${pct}%`,
                    background: over ? 'var(--red)' : cat.color,
                  }} />
                </div>
              </div>

              {editing ? (
                <div className="flex items-center gap-4" style={{ width:80 }}>
                  <input
                    type="number" min="0" max="100" step="1"
                    value={draftGoals?.[cat.id] || ''}
                    placeholder="0"
                    onChange={e => setDraftGoals(prev => ({ ...prev, [cat.id]: parseFloat(e.target.value)||0 }))}
                    style={{ width:52, padding:'4px 8px', border:'1.5px solid var(--border)', borderRadius:6, fontSize:13, textAlign:'center' }}
                  />
                  <span style={{ fontSize:12, color:'var(--text-muted)' }}>%</span>
                </div>
              ) : (
                <div style={{ width:52, textAlign:'right', fontWeight:700, fontSize:14, color:cat.color }}>
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
