import { useState } from 'react'
import { useFinance } from '../contexts/FinanceContext'
import { formatBRL, monthLabel } from '../utils/calculations'

export default function ContasFixas() {
  const { config, monthData, currentMonth, toggleFixedBill, GENERAL_CATEGORIES } = useFinance()
  const [editAmount, setEditAmount] = useState({})  // billId → amount string em edição

  const bills    = config.fixedBills || []
  const recorded = monthData.fixedBills || []

  const getRecord = (id) => recorded.find(r => r.id === id)
  const isPaid    = (id) => getRecord(id)?.paid === true

  const totalExpected = bills.filter(b => b.active).reduce((a, b) => a + (b.amount || 0), 0)
  const totalPaid     = bills.filter(b => isPaid(b.id)).reduce((a, b) => {
    const rec = getRecord(b.id)
    return a + (rec?.amount || b.amount || 0)
  }, 0)
  const totalPending  = totalExpected - totalPaid

  const paidCount    = bills.filter(b => isPaid(b.id)).length
  const pendingCount = bills.filter(b => b.active && !isPaid(b.id)).length

  const handleToggle = async (bill) => {
    const currentRecord = getRecord(bill.id)
    const nowPaid = !isPaid(bill.id)
    const amount = editAmount[bill.id]
      ? parseFloat(editAmount[bill.id]) || bill.amount
      : currentRecord?.amount || bill.amount
    await toggleFixedBill(bill.id, nowPaid, amount)
  }

  const catLabel = (id) => GENERAL_CATEGORIES.find(c => c.id === id)?.label || id
  const catColor = (id) => GENERAL_CATEGORIES.find(c => c.id === id)?.color || '#94A3B8'
  const catIcon  = (id) => GENERAL_CATEGORIES.find(c => c.id === id)?.icon  || '📋'

  // Agrupa por categoria
  const grouped = {}
  bills.forEach(b => {
    if (!grouped[b.category]) grouped[b.category] = []
    grouped[b.category].push(b)
  })

  return (
    <div className="page-body">

      {/* ── KPIs ── */}
      <div className="grid-3 mb-24">
        <div className="metric-card" style={{ background:'var(--grad-primary)' }}>
          <div className="metric-card-icon">🏠</div>
          <div className="metric-card-label">Total Previsto</div>
          <div className="metric-card-value">{formatBRL(totalExpected)}</div>
          <div className="metric-card-sub">{bills.filter(b => b.active).length} contas ativas</div>
        </div>
        <div className="metric-card" style={{ background:'var(--grad-green)' }}>
          <div className="metric-card-icon">✅</div>
          <div className="metric-card-label">Pago</div>
          <div className="metric-card-value">{formatBRL(totalPaid)}</div>
          <div className="metric-card-sub">{paidCount} contas pagas</div>
        </div>
        <div className="metric-card" style={{ background: pendingCount > 0 ? 'var(--grad-orange)' : 'var(--grad-green)' }}>
          <div className="metric-card-icon">⏳</div>
          <div className="metric-card-label">Pendente</div>
          <div className="metric-card-value">{formatBRL(totalPending)}</div>
          <div className="metric-card-sub">{pendingCount} contas em aberto</div>
        </div>
      </div>

      {/* ── Progresso geral ── */}
      <div className="card mb-24">
        <div className="flex justify-between items-center mb-16">
          <div>
            <div style={{ fontWeight:700, fontSize:15 }}>Progresso do Mês — {monthLabel(currentMonth)}</div>
            <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:2 }}>
              {paidCount} de {bills.filter(b => b.active).length} contas pagas
            </div>
          </div>
          <div style={{ fontSize:22, fontWeight:800, color:'var(--green)' }}>
            {bills.filter(b=>b.active).length > 0
              ? `${Math.round((paidCount/bills.filter(b=>b.active).length)*100)}%`
              : '0%'}
          </div>
        </div>
        <div className="progress-bar-wrap" style={{ height:10 }}>
          <div
            className="progress-bar-fill"
            style={{
              width: bills.filter(b=>b.active).length > 0
                ? `${(paidCount/bills.filter(b=>b.active).length)*100}%`
                : '0%',
              background:'var(--grad-green)',
            }}
          />
        </div>
      </div>

      {/* ── Lista por categoria ── */}
      {Object.entries(grouped).map(([catId, catBills]) => {
        const catTotal = catBills.filter(b=>b.active).reduce((a,b) => a+(b.amount||0), 0)
        const catPaid  = catBills.filter(b=>isPaid(b.id)).reduce((a,b) => {
          const rec = getRecord(b.id)
          return a + (rec?.amount||b.amount||0)
        }, 0)

        return (
          <div className="card mb-16" key={catId}>
            <div className="flex justify-between items-center mb-16">
              <div className="flex items-center gap-8">
                <div style={{ width:32, height:32, borderRadius:8, background:catColor(catId)+'20', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>
                  {catIcon(catId)}
                </div>
                <div>
                  <div style={{ fontWeight:700, fontSize:14 }}>{catLabel(catId)}</div>
                  <div style={{ fontSize:12, color:'var(--text-secondary)' }}>
                    {catBills.filter(b=>b.active).length} contas · {formatBRL(catTotal)} previsto
                  </div>
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontWeight:700, color:'var(--green)' }}>{formatBRL(catPaid)} pago</div>
                <div style={{ fontSize:12, color:'var(--text-secondary)' }}>de {formatBRL(catTotal)}</div>
              </div>
            </div>

            {catBills.map(bill => {
              const rec  = getRecord(bill.id)
              const paid = isPaid(bill.id)
              const currentAmt = rec?.amount || bill.amount || 0

              return (
                <div
                  key={bill.id}
                  style={{
                    display:'flex', alignItems:'center', gap:12,
                    padding:'12px 0',
                    borderTop:'1px solid var(--border)',
                    opacity: bill.active ? 1 : 0.4,
                  }}
                >
                  {/* Toggle pago */}
                  <button
                    className={`toggle ${paid ? 'on' : 'off'}`}
                    onClick={() => handleToggle(bill)}
                    title={paid ? 'Marcar como não pago' : 'Marcar como pago'}
                  />

                  {/* Info */}
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:14, textDecoration: paid ? 'line-through' : 'none', color: paid ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                      {bill.label}
                    </div>
                    <div className="flex items-center gap-8" style={{ marginTop:3 }}>
                      {bill.person === 'tereza'    && <span className="badge badge-tereza text-sm">Tereza</span>}
                      {bill.person === 'sebastiao' && <span className="badge badge-sebastiao text-sm">Sebastião</span>}
                      {bill.person === 'both'      && <span className="badge badge-both text-sm">Ambos</span>}
                      {paid && rec?.paidAt && (
                        <span style={{ fontSize:11, color:'var(--text-muted)' }}>
                          Pago em {new Date(rec.paidAt).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Valor editável */}
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:12, color:'var(--text-muted)' }}>R$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={editAmount[bill.id] !== undefined ? editAmount[bill.id] : currentAmt}
                      onChange={e => setEditAmount(prev => ({ ...prev, [bill.id]: e.target.value }))}
                      onBlur={async (e) => {
                        const val = parseFloat(e.target.value) || bill.amount
                        if (paid) {
                          await toggleFixedBill(bill.id, true, val)
                        }
                        setEditAmount(prev => ({ ...prev, [bill.id]: undefined }))
                      }}
                      style={{
                        width: 90, padding:'4px 8px',
                        border:'1.5px solid var(--border)', borderRadius:6,
                        fontSize:14, fontWeight:600, textAlign:'right',
                        background: paid ? '#F0FDF4' : 'var(--card)',
                        color: paid ? 'var(--green)' : 'var(--text-primary)',
                      }}
                    />
                  </div>

                  {/* Status badge */}
                  {paid
                    ? <span className="badge badge-green">✓ Pago</span>
                    : <span className="badge badge-orange">Pendente</span>
                  }
                </div>
              )
            })}
          </div>
        )
      })}

      {bills.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🏠</div>
            <div className="empty-state-text">Nenhuma conta fixa cadastrada.<br />Vá em Configurações para adicionar.</div>
          </div>
        </div>
      )}
    </div>
  )
}
