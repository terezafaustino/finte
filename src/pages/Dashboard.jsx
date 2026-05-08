import { useMemo } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { useFinance } from '../contexts/FinanceContext'
import {
  formatBRL, formatPct, lastNMonths, monthLabel, calcMonthTotals, generateInsights
} from '../utils/calculations'

const GRAD_COLORS = [
  '#8B5CF6','#EC4899','#3B82F6','#10B981',
  '#F59E0B','#EF4444','#06B6D4','#F97316','#14B8A6','#D946EF',
]

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:8, padding:'8px 12px', boxShadow:'0 4px 12px rgba(0,0,0,0.1)' }}>
      <div style={{ fontWeight:600, marginBottom:4, fontSize:12 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize:12, color:p.color, display:'flex', gap:8 }}>
          <span>{p.name}:</span>
          <span style={{ fontWeight:600 }}>{formatBRL(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { config, allMonths, monthData, currentMonth, GENERAL_CATEGORIES, CARD_CATEGORIES, SUBCATEGORY_TO_MAIN } = useFinance()
  const { computedData } = useFinance()
  const data = computedData()

  // Últimos 6 meses para gráfico de linha
  const trendData = useMemo(() => {
    return lastNMonths(6).map(key => {
      const t = calcMonthTotals(allMonths[key], config)
      return { label: monthLabel(key), tereza: t.tereza, sebastiao: t.sebastiao, total: t.total }
    })
  }, [allMonths, config])

  // Distribuição por categoria (donut)
  const catData = useMemo(() => {
    const merged = {}
    const resolve = (id) => SUBCATEGORY_TO_MAIN[id] || id
    // Contas fixas pagas
    ;(monthData.fixedBills || []).filter(b => b.paid).forEach(b => {
      const cfg = config.fixedBills.find(f => f.id === b.id)
      if (!cfg) return
      const cat = resolve(cfg.category)
      merged[cat] = (merged[cat] || 0) + (b.amount || cfg.amount || 0)
    })
    // Transações de cartão
    ;(monthData.transactions || []).forEach(tx => {
      const cat = resolve(tx.category)
      merged[cat] = (merged[cat] || 0) + tx.amount
    })
    // Pagamentos avulsos
    ;(monthData.extraPayments || []).forEach(ep => {
      const cat = resolve(ep.category)
      merged[cat] = (merged[cat] || 0) + (ep.amount || 0)
    })
    return Object.entries(merged).map(([id, value]) => {
      const cat = GENERAL_CATEGORIES.find(c => c.id === id)
      return { name: cat?.label || id, value, color: cat?.color || '#94A3B8' }
    }).filter(c => c.value > 0).sort((a, b) => b.value - a.value)
  }, [monthData, config, GENERAL_CATEGORIES, SUBCATEGORY_TO_MAIN])

  // Total gasto no mês
  const totalGastoTereza    = data.byPerson.tereza    + data.fixedPaid.tereza
  const totalGastoSebastiao = data.byPerson.sebastiao + data.fixedPaid.sebastiao
  const totalGasto          = totalGastoTereza + totalGastoSebastiao
  const totalIncome         = data.totalIncome.tereza + data.totalIncome.sebastiao

  // Saldo
  const saldoT = data.totalIncome.tereza    - totalGastoTereza
  const saldoS = data.totalIncome.sebastiao - totalGastoSebastiao

  // Insights
  const insights = useMemo(() => generateInsights(data, config), [data, config])

  // Pendências cartão
  const uncategorized = (monthData.transactions || []).filter(tx => !tx.category || !tx.person)

  return (
    <div className="page-body">

      {/* ── KPIs ── */}
      <div className="grid-4 mb-24">
        <div className="metric-card" style={{ background:'var(--grad-primary)' }}>
          <div className="metric-card-icon">💰</div>
          <div className="metric-card-label">Receita Total</div>
          <div className="metric-card-value">{formatBRL(totalIncome)}</div>
          <div className="metric-card-sub">Tereza + Sebastião</div>
        </div>

        <div className="metric-card" style={{ background:'var(--grad-red)' }}>
          <div className="metric-card-icon">💸</div>
          <div className="metric-card-label">Total Gastos</div>
          <div className="metric-card-value">{formatBRL(totalGasto)}</div>
          <div className="metric-card-sub">{formatPct(totalIncome ? (totalGasto/totalIncome)*100 : 0)} da renda</div>
        </div>

        <div className="metric-card" style={{ background: saldoT >= 0 ? 'var(--grad-green)' : 'var(--grad-orange)' }}>
          <div className="metric-card-icon">T</div>
          <div className="metric-card-label">Saldo — Tereza</div>
          <div className="metric-card-value">{formatBRL(saldoT)}</div>
          <div className="metric-card-sub">Gasto: {formatBRL(totalGastoTereza)}</div>
        </div>

        <div className="metric-card" style={{ background: saldoS >= 0 ? 'var(--grad-blue)' : 'var(--grad-orange)' }}>
          <div className="metric-card-icon">S</div>
          <div className="metric-card-label">Saldo — Sebastião</div>
          <div className="metric-card-value">{formatBRL(saldoS)}</div>
          <div className="metric-card-sub">Gasto: {formatBRL(totalGastoSebastiao)}</div>
        </div>
      </div>

      {/* ── Dívida cartão ── */}
      {data.installmentDebt > 0 && (
        <div className="card mb-24" style={{ borderLeft:'4px solid var(--orange)', background:'#FFFBEB' }}>
          <div className="flex items-center justify-between">
            <div>
              <div style={{ fontWeight:700, fontSize:14 }}>⚠️ Dívida total em parcelamentos</div>
              <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:2 }}>
                Parcelas futuras pendentes nos seus cartões
              </div>
            </div>
            <div style={{ fontSize:22, fontWeight:800, color:'var(--orange)' }}>
              {formatBRL(data.installmentDebt)}
            </div>
          </div>
        </div>
      )}

      {/* ── Alertas pendências ── */}
      {uncategorized.length > 0 && (
        <div className="insight-card alert mb-24">
          <div className="insight-icon">❗</div>
          <div>
            <div className="insight-title">{uncategorized.length} transação(ões) aguardando classificação</div>
            <div className="insight-msg">Vá em Cartões → selecione a categoria e a pessoa responsável.</div>
          </div>
        </div>
      )}

      {/* ── Gráficos ── */}
      <div className="grid-2 mb-24">

        {/* Linha — evolução mensal */}
        <div className="card card-lg">
          <div className="section-title">📈 Evolução dos Gastos</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData}>
              <XAxis dataKey="label" tick={{ fontSize:11, fill:'#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:11, fill:'#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="tereza"    stroke="#EC4899" strokeWidth={2.5} dot={{ fill:'#EC4899', r:4 }} name="Tereza" />
              <Line type="monotone" dataKey="sebastiao" stroke="#8B5CF6" strokeWidth={2.5} dot={{ fill:'#8B5CF6', r:4 }} name="Sebastião" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Donut — distribuição por categoria */}
        <div className="card card-lg">
          <div className="section-title">🍩 Gastos por Categoria</div>
          {catData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={catData} cx="45%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2} dataKey="value">
                  {catData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v) => formatBRL(v)} />
                <Legend iconSize={8} iconType="circle" formatter={(v) => <span style={{ fontSize:11 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <div className="empty-state-text">Nenhuma transação este mês</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Insights ── */}
      <div className="mb-24">
        <div className="section-title">💡 Insights do Mês</div>
        <div className="flex-col gap-8">
          {insights.map((ins, i) => (
            <div key={i} className={`insight-card ${ins.type}`}>
              <div className="insight-icon">{ins.icon}</div>
              <div>
                <div className="insight-title">{ins.title}</div>
                <div className="insight-msg">{ins.message}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Top categorias tabela ── */}
      {catData.length > 0 && (
        <div className="card">
          <div className="section-title">📋 Resumo por Categoria</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Categoria</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">% da Renda</th>
                  <th>Distribuição</th>
                </tr>
              </thead>
              <tbody>
                {catData.map((cat, i) => {
                  const pct = totalIncome > 0 ? (cat.value / totalIncome) * 100 : 0
                  return (
                    <tr key={i}>
                      <td>
                        <div className="flex items-center gap-8">
                          <div style={{ width:10, height:10, borderRadius:2, background:cat.color, flexShrink:0 }} />
                          <span style={{ fontWeight:500 }}>{cat.name}</span>
                        </div>
                      </td>
                      <td className="text-right font-semibold">{formatBRL(cat.value)}</td>
                      <td className="text-right">
                        <span style={{ color: pct > 30 ? 'var(--red)' : pct > 20 ? 'var(--orange)' : 'var(--green)', fontWeight:600 }}>
                          {formatPct(pct)}
                        </span>
                      </td>
                      <td style={{ minWidth:120 }}>
                        <div className="progress-bar-wrap">
                          <div className="progress-bar-fill" style={{ width:`${Math.min(pct*2,100)}%`, background:cat.color }} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
