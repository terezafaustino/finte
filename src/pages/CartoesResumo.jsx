import { useState, useMemo } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts'
import { useFinance } from '../contexts/FinanceContext'
import { formatBRL, monthLabel } from '../utils/calculations'

const RADIAN = Math.PI / 180
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.04) return null
  const r = innerRadius + (outerRadius - innerRadius) * 0.6
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {(percent * 100).toFixed(0)}%
    </text>
  )
}

export default function CartoesResumo() {
  const { config, monthData, currentMonth, CARD_CATEGORIES } = useFinance()
  const [activeCard, setActiveCard] = useState('all')

  const cards  = config.cards || []
  const allTxs = monthData.transactions || []

  // Filtrar por cartão selecionado
  const txs = useMemo(() =>
    activeCard === 'all' ? allTxs : allTxs.filter(t => t.cardId === activeCard),
    [allTxs, activeCard]
  )

  const totalGeral = txs.reduce((a, t) => a + t.amount, 0)
  const totalT     = txs.filter(t => t.person === 'tereza').reduce((a, t) => a + t.amount, 0)
  const totalS     = txs.filter(t => t.person === 'sebastiao').reduce((a, t) => a + t.amount, 0)

  // Total por cartão (sempre todos os txs)
  const totalByCard = useMemo(() => {
    const map = {}
    allTxs.forEach(t => { map[t.cardId] = (map[t.cardId] || 0) + t.amount })
    return map
  }, [allTxs])

  // Donut — por categoria
  const catData = useMemo(() => {
    const map = {}
    txs.forEach(t => { map[t.category] = (map[t.category] || 0) + t.amount })
    return Object.entries(map)
      .map(([id, total]) => {
        const cat = CARD_CATEGORIES.find(c => c.id === id)
        return { id, label: cat?.label || id, color: cat?.color || '#94A3B8', icon: cat?.icon || '❓', total }
      })
      .sort((a, b) => b.total - a.total)
  }, [txs, CARD_CATEGORIES])

  // Donut — por pessoa
  const pessoaData = [
    { name: 'Tereza',    value: totalT, color: '#EC4899' },
    { name: 'Sebastião', value: totalS, color: '#8B5CF6' },
  ].filter(d => d.value > 0)

  // Barra — comparativo de categorias T vs S
  const barData = useMemo(() => {
    const map = {}
    txs.forEach(t => {
      if (!map[t.category]) map[t.category] = { tereza: 0, sebastiao: 0 }
      if (t.person === 'tereza')    map[t.category].tereza    += t.amount
      if (t.person === 'sebastiao') map[t.category].sebastiao += t.amount
    })
    return Object.entries(map)
      .map(([id, vals]) => {
        const cat = CARD_CATEGORIES.find(c => c.id === id)
        return { name: cat?.icon ? `${cat.icon} ${cat.label.split(' ')[0]}` : id, ...vals }
      })
      .sort((a, b) => (b.tereza + b.sebastiao) - (a.tereza + a.sebastiao))
      .slice(0, 8)
  }, [txs, CARD_CATEGORIES])

  // Top 10 transações
  const topTxs = useMemo(() =>
    [...txs].sort((a, b) => b.amount - a.amount).slice(0, 10),
    [txs]
  )

  // Parcelamentos em aberto
  const parcelas = useMemo(() =>
    txs.filter(t => t.installmentTotal > 1)
       .map(t => ({
         ...t,
         restante: (t.installmentTotal - t.installmentNumber) * (t.installmentAmount || t.amount),
         cat: CARD_CATEGORIES.find(c => c.id === t.category),
         card: cards.find(c => c.id === t.cardId),
       }))
       .sort((a, b) => b.restante - a.restante),
    [txs, CARD_CATEGORIES, cards]
  )

  return (
    <div className="page-body">

      {/* ── Filtro por cartão ── */}
      <div className="flex gap-8 mb-24" style={{ flexWrap:'wrap' }}>
        <button
          className={`btn btn-sm ${activeCard === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveCard('all')}
        >
          🗂 Todos os cartões
        </button>
        {cards.map(c => (
          <button
            key={c.id}
            className={`btn btn-sm ${activeCard === c.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveCard(c.id)}
            style={{ borderLeft: `3px solid ${c.color}` }}
          >
            💳 {c.bank}
            {totalByCard[c.id] > 0 && (
              <span style={{ marginLeft:6, fontSize:11, opacity:0.8 }}>{formatBRL(totalByCard[c.id])}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── KPIs ── */}
      <div className="grid-4 mb-24">
        <div className="metric-card" style={{ background:'var(--grad-primary)' }}>
          <div className="metric-card-icon">💳</div>
          <div className="metric-card-label">Total Fatura</div>
          <div className="metric-card-value">{formatBRL(totalGeral)}</div>
          <div className="metric-card-sub">{txs.length} transações · {monthLabel(currentMonth)}</div>
        </div>
        <div className="metric-card" style={{ background:'var(--grad-red)' }}>
          <div className="metric-card-icon">T</div>
          <div className="metric-card-label">Tereza</div>
          <div className="metric-card-value">{formatBRL(totalT)}</div>
          <div className="metric-card-sub">
            {totalGeral > 0 ? `${((totalT/totalGeral)*100).toFixed(0)}% do total` : '—'}
          </div>
        </div>
        <div className="metric-card" style={{ background:'var(--grad-blue)' }}>
          <div className="metric-card-icon">S</div>
          <div className="metric-card-label">Sebastião</div>
          <div className="metric-card-value">{formatBRL(totalS)}</div>
          <div className="metric-card-sub">
            {totalGeral > 0 ? `${((totalS/totalGeral)*100).toFixed(0)}% do total` : '—'}
          </div>
        </div>
        <div className="metric-card" style={{ background:'var(--grad-green)' }}>
          <div className="metric-card-icon">📦</div>
          <div className="metric-card-label">Parcelamentos</div>
          <div className="metric-card-value">
            {formatBRL(parcelas.reduce((a, p) => a + p.restante, 0))}
          </div>
          <div className="metric-card-sub">{parcelas.length} compras em aberto</div>
        </div>
      </div>

      {txs.length === 0 ? (
        <div className="card" style={{ textAlign:'center', padding:'48px 24px', color:'var(--text-secondary)' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>💳</div>
          <div style={{ fontWeight:600, fontSize:16 }}>Nenhuma transação importada</div>
          <div style={{ fontSize:13, marginTop:6 }}>Vá em Cartões para importar a fatura do PDF</div>
        </div>
      ) : (
        <>
          {/* ── Gráficos: Donut + Barra ── */}
          <div className="grid-2 mb-24">

            {/* Donut categorias */}
            <div className="card card-lg">
              <div className="section-title">🍩 Gastos por Categoria</div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={catData} dataKey="total" nameKey="label"
                    cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                    labelLine={false} label={renderCustomLabel}>
                    {catData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatBRL(v)} />
                </PieChart>
              </ResponsiveContainer>

              {/* Legenda */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px 12px', marginTop:8 }}>
                {catData.map(c => (
                  <div key={c.id} style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ width:10, height:10, borderRadius:2, background:c.color, flexShrink:0 }} />
                    <span style={{ fontSize:11, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {c.icon} {c.label}
                    </span>
                    <span style={{ fontSize:11, fontWeight:700, flexShrink:0 }}>{formatBRL(c.total)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Donut pessoas + barras */}
            <div className="card card-lg" style={{ display:'flex', flexDirection:'column', gap:20 }}>
              {/* Donut T vs S */}
              <div>
                <div className="section-title" style={{ marginBottom:8 }}>👥 Divisão Tereza × Sebastião</div>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={pessoaData} dataKey="value" nameKey="name"
                      cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                      labelLine={false} label={renderCustomLabel}>
                      {pessoaData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatBRL(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-16" style={{ justifyContent:'center', fontSize:12 }}>
                  <div className="flex items-center gap-6">
                    <div style={{ width:10, height:10, borderRadius:50, background:'#EC4899' }} />
                    <span>Tereza — {formatBRL(totalT)}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <div style={{ width:10, height:10, borderRadius:50, background:'#8B5CF6' }} />
                    <span>Sebastião — {formatBRL(totalS)}</span>
                  </div>
                </div>
              </div>

              {/* Barra T vs S por categoria */}
              {barData.length > 0 && (
                <div>
                  <div className="section-title" style={{ marginBottom:8 }}>📊 Categorias — T vs S</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={barData} layout="vertical" margin={{ left:4, right:12, top:0, bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} fontSize={9} />
                      <YAxis type="category" dataKey="name" width={80} fontSize={9} />
                      <Tooltip formatter={(v) => formatBRL(v)} />
                      <Bar dataKey="tereza"    name="Tereza"    fill="#EC4899" radius={[0,3,3,0]} />
                      <Bar dataKey="sebastiao" name="Sebastião" fill="#8B5CF6" radius={[0,3,3,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* ── Total por cartão ── */}
          {activeCard === 'all' && (
            <div className="card mb-24">
              <div className="section-title">💳 Total por Cartão</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:12 }}>
                {cards.filter(c => totalByCard[c.id] > 0).map(c => {
                  const cardTxs = allTxs.filter(t => t.cardId === c.id)
                  const cardTotal = totalByCard[c.id] || 0
                  const pct = totalGeral > 0 ? (cardTotal / totalGeral) * 100 : 0
                  return (
                    <div key={c.id}
                      onClick={() => setActiveCard(c.id)}
                      style={{
                        padding:'14px 16px', borderRadius:10, cursor:'pointer',
                        border:`2px solid ${c.color}20`, background:`${c.color}08`,
                        transition:'box-shadow 0.15s',
                      }}
                    >
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                        <div style={{ width:10, height:10, borderRadius:50, background:c.color }} />
                        <span style={{ fontWeight:700, fontSize:14 }}>{c.bank}</span>
                        <span style={{ fontSize:11, color:'var(--text-muted)', marginLeft:'auto' }}>{c.brand}</span>
                      </div>
                      <div style={{ fontSize:20, fontWeight:900, color:c.color }}>{formatBRL(cardTotal)}</div>
                      <div style={{ fontSize:11, color:'var(--text-secondary)', marginTop:2 }}>
                        {cardTxs.length} tx · {pct.toFixed(0)}% do total
                      </div>
                      <div className="progress-bar-wrap" style={{ height:4, marginTop:8 }}>
                        <div className="progress-bar-fill" style={{ width:`${pct}%`, background:c.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="grid-2 mb-24">
            {/* ── Top 10 transações ── */}
            <div className="card card-lg" style={{ overflow:'auto' }}>
              <div className="section-title">🏆 Maiores Gastos</div>
              {topTxs.map((t, i) => {
                const cat  = CARD_CATEGORIES.find(c => c.id === t.category)
                const card = cards.find(c => c.id === t.cardId)
                return (
                  <div key={t.id} style={{
                    display:'flex', alignItems:'center', gap:10,
                    padding:'10px 0', borderTop:'1px solid var(--border)'
                  }}>
                    <div style={{
                      width:24, height:24, borderRadius:6, flexShrink:0,
                      background:'var(--bg-secondary)', display:'flex',
                      alignItems:'center', justifyContent:'center',
                      fontSize:11, fontWeight:700, color:'var(--text-secondary)'
                    }}>{i + 1}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:600, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {t.description}
                      </div>
                      <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                        {cat?.icon} {cat?.label || t.category}
                        {card && <span style={{ marginLeft:6, color:card.color }}>· {card.bank}</span>}
                        {t.installmentTotal > 1 && (
                          <span style={{ marginLeft:6, background:'#EDE9FE', color:'#7C3AED', padding:'1px 5px', borderRadius:4, fontSize:10 }}>
                            {t.installmentNumber}/{t.installmentTotal}x
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontWeight:800, fontSize:14, color: t.person === 'tereza' ? '#EC4899' : '#8B5CF6' }}>
                        {formatBRL(t.amount)}
                      </div>
                      <div className="avatar" style={{
                        background: t.person === 'tereza' ? 'var(--pink)' : 'var(--purple)',
                        width:16, height:16, fontSize:9, marginLeft:'auto', marginTop:2
                      }}>
                        {t.person === 'tereza' ? 'T' : 'S'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ── Parcelamentos em aberto ── */}
            <div className="card card-lg" style={{ overflow:'auto' }}>
              <div className="section-title">📦 Parcelamentos em Aberto</div>
              {parcelas.length === 0 ? (
                <div style={{ textAlign:'center', padding:'24px 0', color:'var(--text-muted)', fontSize:13 }}>
                  Nenhum parcelamento ativo
                </div>
              ) : parcelas.map(t => (
                <div key={t.id} style={{
                  display:'flex', alignItems:'center', gap:10,
                  padding:'10px 0', borderTop:'1px solid var(--border)'
                }}>
                  <div style={{
                    width:32, height:32, borderRadius:8, flexShrink:0,
                    background:(t.cat?.color || '#94A3B8')+'20',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:16
                  }}>{t.cat?.icon || '❓'}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {t.description}
                    </div>
                    <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                      Parcela {t.installmentNumber}/{t.installmentTotal}
                      {t.card && <span style={{ marginLeft:6, color:t.card.color }}>· {t.card.bank}</span>}
                    </div>
                    <div className="progress-bar-wrap" style={{ height:3, marginTop:4 }}>
                      <div className="progress-bar-fill" style={{
                        width:`${(t.installmentNumber/t.installmentTotal)*100}%`,
                        background: t.cat?.color || '#94A3B8'
                      }} />
                    </div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontWeight:700, fontSize:13 }}>{formatBRL(t.amount)}</div>
                    <div style={{ fontSize:10, color:'var(--text-muted)' }}>
                      restam {formatBRL(t.restante)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
