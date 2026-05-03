import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend, LineChart, Line } from 'recharts'
import { useFinance } from '../contexts/FinanceContext'
import { formatBRL, projectMonths, yearMonths, monthLabel, calcMonthTotals } from '../utils/calculations'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:8, padding:'10px 14px', boxShadow:'0 4px 12px rgba(0,0,0,0.1)' }}>
      <div style={{ fontWeight:700, marginBottom:6, fontSize:12 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize:12, color:p.color, display:'flex', gap:8, justifyContent:'space-between' }}>
          <span>{p.name}:</span>
          <span style={{ fontWeight:600 }}>{formatBRL(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function Relatorios() {
  const { config, allMonths, currentMonth } = useFinance()
  const year = parseInt(currentMonth.split('-')[0])

  const projections = useMemo(() => projectMonths(allMonths, config, year), [allMonths, config, year])

  // Ano anterior para comparação
  const prevYear     = year - 1
  const prevProj     = useMemo(() => projectMonths(allMonths, config, prevYear), [allMonths, config, prevYear])

  // Totais anuais projetados
  const annualTereza    = projections.reduce((a, m) => a + m.tereza, 0)
  const annualSebastiao = projections.reduce((a, m) => a + m.sebastiao, 0)
  const annualTotal     = annualTereza + annualSebastiao

  // Receita anual (incluindo 13º)
  const incomeBase      = config.incomes?.reduce((a, i) => a + (i.amount||0), 0) || 0
  const thirteenthBonus = config.incomes?.filter(i=>i.hasThirteenth).reduce((a,i) => a+(i.amount||0), 0) || 0
  const annualIncome    = incomeBase * 12 + thirteenthBonus
  const annualBalance   = annualIncome - annualTotal

  // Mês com maior gasto projetado
  const peakMonth = projections.reduce((max, m) => m.tereza+m.sebastiao > max.tereza+max.sebastiao ? m : max, projections[0])

  // Dados para gráfico com barra de 13º
  const chartData = projections.map(m => ({
    ...m,
    thirteenth: m.thirteenthBonus.tereza + m.thirteenthBonus.sebastiao,
    total: m.tereza + m.sebastiao,
  }))

  // Meses com dados reais vs projetados
  const realCount = projections.filter(m => !m.isProjected).length

  return (
    <div className="page-body">

      {/* ── KPIs anuais ── */}
      <div className="grid-4 mb-24">
        <div className="metric-card" style={{ background:'var(--grad-primary)' }}>
          <div className="metric-card-icon">📅</div>
          <div className="metric-card-label">Receita Anual {year}</div>
          <div className="metric-card-value">{formatBRL(annualIncome)}</div>
          <div className="metric-card-sub">Inclui 13º salários</div>
        </div>
        <div className="metric-card" style={{ background:'var(--grad-red)' }}>
          <div className="metric-card-icon">💸</div>
          <div className="metric-card-label">Gasto Anual Projetado</div>
          <div className="metric-card-value">{formatBRL(annualTotal)}</div>
          <div className="metric-card-sub">{realCount} meses reais + {12-realCount} projeção</div>
        </div>
        <div className="metric-card" style={{ background: annualBalance >= 0 ? 'var(--grad-green)' : 'var(--grad-orange)' }}>
          <div className="metric-card-icon">💰</div>
          <div className="metric-card-label">Saldo Anual Projetado</div>
          <div className="metric-card-value">{formatBRL(annualBalance)}</div>
          <div className="metric-card-sub">{annualIncome > 0 ? `${((annualBalance/annualIncome)*100).toFixed(0)}% da renda` : ''}</div>
        </div>
        <div className="metric-card" style={{ background:'var(--grad-orange)' }}>
          <div className="metric-card-icon">📊</div>
          <div className="metric-card-label">Pico de Gastos</div>
          <div className="metric-card-value">{peakMonth?.label}</div>
          <div className="metric-card-sub">{formatBRL((peakMonth?.tereza||0)+(peakMonth?.sebastiao||0))}</div>
        </div>
      </div>

      {/* ── Gráfico barras anuais ── */}
      <div className="card card-lg mb-24">
        <div className="flex justify-between items-center mb-16">
          <div className="section-title" style={{ marginBottom:0 }}>📊 Gastos Mensais — {year}</div>
          <div className="flex gap-8">
            <span className="badge badge-gray">Barras sólidas = dados reais</span>
            <span className="badge badge-blue">Barras claras = projeção</span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} barCategoryGap="25%">
            <XAxis dataKey="label" tick={{ fontSize:11, fill:'#9CA3AF' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize:11, fill:'#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="tereza"    name="Tereza"    fill="#EC4899" radius={[4,4,0,0]}
              opacity={chartData.map(d => d.isProjected ? 0.45 : 1)} />
            <Bar dataKey="sebastiao" name="Sebastião" fill="#8B5CF6" radius={[4,4,0,0]}
              opacity={chartData.map(d => d.isProjected ? 0.45 : 1)} />
            {/* Marca o mês atual */}
            <ReferenceLine x={monthLabel(currentMonth)} stroke="var(--orange)" strokeDasharray="4 2" label={{ value:'Hoje', fontSize:10, fill:'var(--orange)' }} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Linha: comparativo ano anterior ── */}
      <div className="card card-lg mb-24">
        <div className="section-title">📈 Comparativo {prevYear} vs {year}</div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={projections.map((m, i) => ({
            label: m.label,
            [year]:    m.tereza + m.sebastiao,
            [prevYear]: (prevProj[i]?.tereza||0) + (prevProj[i]?.sebastiao||0),
          }))}>
            <XAxis dataKey="label" tick={{ fontSize:11, fill:'#9CA3AF' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize:11, fill:'#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey={year}     name={String(year)}     stroke="#8B5CF6" strokeWidth={2.5} dot={{ r:3 }} />
            <Line type="monotone" dataKey={prevYear} name={String(prevYear)} stroke="#D1D5DB" strokeWidth={2} strokeDasharray="4 2" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Tabela detalhada ── */}
      <div className="card">
        <div className="section-title">📋 Detalhe Mensal {year}</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mês</th>
                <th className="text-right">Tereza</th>
                <th className="text-right">Sebastião</th>
                <th className="text-right">Total</th>
                <th className="text-right">13º Bônus</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {projections.map((m, i) => {
                const total = m.tereza + m.sebastiao
                return (
                  <tr key={m.key}>
                    <td style={{ fontWeight: m.key===currentMonth ? 700 : 400 }}>
                      {m.label}
                      {m.key === currentMonth && <span className="badge badge-blue" style={{ marginLeft:8 }}>atual</span>}
                    </td>
                    <td className="text-right" style={{ color:'var(--pink)', fontWeight:600 }}>{formatBRL(m.tereza)}</td>
                    <td className="text-right" style={{ color:'var(--purple)', fontWeight:600 }}>{formatBRL(m.sebastiao)}</td>
                    <td className="text-right font-bold">{formatBRL(total)}</td>
                    <td className="text-right" style={{ color:'var(--orange)' }}>
                      {m.thirteenthBonus.tereza+m.thirteenthBonus.sebastiao > 0
                        ? formatBRL(m.thirteenthBonus.tereza+m.thirteenthBonus.sebastiao)
                        : '—'}
                    </td>
                    <td>
                      {m.isProjected
                        ? <span className="badge badge-blue">Projeção</span>
                        : <span className="badge badge-green">✓ Real</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <td style={{ fontWeight:800 }}>TOTAL {year}</td>
                <td className="text-right font-bold" style={{ color:'var(--pink)' }}>{formatBRL(annualTereza)}</td>
                <td className="text-right font-bold" style={{ color:'var(--purple)' }}>{formatBRL(annualSebastiao)}</td>
                <td className="text-right font-bold">{formatBRL(annualTotal)}</td>
                <td className="text-right" style={{ color:'var(--orange)', fontWeight:700 }}>{formatBRL(thirteenthBonus)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
