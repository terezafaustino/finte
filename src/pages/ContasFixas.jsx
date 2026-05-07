import { useState, useMemo } from 'react'
import { useFinance } from '../contexts/FinanceContext'
import { formatBRL, monthLabel } from '../utils/calculations'

const inputNoSpinner = { MozAppearance: 'textfield', WebkitAppearance: 'none' }

export default function ContasFixas() {
  const {
    config, monthData, currentMonth,
    toggleFixedBill, toggleCardPayment, setCardPaymentPerson,
    saveExtraPayment, deleteExtraPayment,
    GENERAL_CATEGORIES,
  } = useFinance()

  const [editAmount, setEditAmount]         = useState({})
  const [showAddPayment, setShowAddPayment] = useState(false)
  const [newPayment, setNewPayment]         = useState({ label: '', category: 'custos_fixos_essenciais', amount: '', person: 'both' })
  const [saving, setSaving]                 = useState(false)

  // ── Contas fixas ──
  const bills    = config.fixedBills || []
  const recorded = monthData.fixedBills || []

  const getRecord = (id) => recorded.find(r => r.id === id)
  const isPaid    = (id) => getRecord(id)?.paid === true

  const totalExpected = bills.filter(b => b.active).reduce((a, b) => a + (b.amount || 0), 0)
  const totalPaid     = bills.filter(b => isPaid(b.id)).reduce((a, b) => {
    const rec = getRecord(b.id)
    return a + (rec?.amount || b.amount || 0)
  }, 0)
  const paidCount    = bills.filter(b => isPaid(b.id)).length
  const pendingCount = bills.filter(b => b.active && !isPaid(b.id)).length

  // ── Cartões ──
  const cards        = config.cards || []
  const cardPayments = monthData.cardPayments || []

  // Pessoa responsável pelo pagamento da fatura deste cartão neste mês
  // Prioridade: override mensal (cardPayments) > padrão do config
  const getCardPerson = (card) => {
    const rec = cardPayments.find(p => p.cardId === card.id)
    return rec?.person || card.person || 'tereza'
  }

  const cardTotals = useMemo(() => {
    const txs = monthData.transactions || []
    const totals = {}
    txs.forEach(tx => {
      if (!totals[tx.cardId]) totals[tx.cardId] = 0
      totals[tx.cardId] += tx.amount || 0
    })
    return totals
  }, [monthData.transactions])

  const isCardPaid = (cardId) => cardPayments.find(p => p.cardId === cardId)?.paid === true
  const cardPaidAt = (cardId) => cardPayments.find(p => p.cardId === cardId)?.paidAt

  const totalCardExpected = cards.reduce((a, c) => a + (cardTotals[c.id] || 0), 0)
  const totalCardPaid     = cards.filter(c => isCardPaid(c.id)).reduce((a, c) => a + (cardTotals[c.id] || 0), 0)

  // ── Pagamentos avulsos ──
  const extraPayments = monthData.extraPayments || []
  const totalExtra    = extraPayments.reduce((a, p) => a + (p.amount || 0), 0)

  // ── KPI geral ──
  const grandTotal = totalExpected + totalCardExpected + totalExtra
  const grandPaid  = totalPaid + totalCardPaid + totalExtra

  const catLabel = (id) => GENERAL_CATEGORIES.find(c => c.id === id)?.label || id
  const catColor = (id) => GENERAL_CATEGORIES.find(c => c.id === id)?.color || '#94A3B8'
  const catIcon  = (id) => GENERAL_CATEGORIES.find(c => c.id === id)?.icon  || '📋'

  // ── Handlers contas fixas ──
  const handleToggle = async (bill) => {
    const currentRecord = getRecord(bill.id)
    const nowPaid = !isPaid(bill.id)
    const amount = editAmount[bill.id] !== undefined
      ? parseFloat(editAmount[bill.id]) || bill.amount
      : currentRecord?.amount || bill.amount
    await toggleFixedBill(bill.id, nowPaid, amount)
  }

  const handleAmountBlur = async (bill, value) => {
    const val = parseFloat(value) || bill.amount
    await toggleFixedBill(bill.id, isPaid(bill.id), val)
    setEditAmount(prev => ({ ...prev, [bill.id]: undefined }))
  }

  // ── Handler pagamentos avulsos ──
  const handleAddPayment = async () => {
    const amt = parseFloat(newPayment.amount)
    if (!newPayment.label.trim() || !amt || amt <= 0) return
    setSaving(true)
    try {
      await saveExtraPayment({
        id:        `ep_${Date.now()}`,
        label:     newPayment.label.trim(),
        category:  newPayment.category,
        amount:    amt,
        person:    newPayment.person,
        createdAt: new Date().toISOString(),
      })
      setNewPayment({ label: '', category: 'custos_fixos_essenciais', amount: '', person: 'both' })
      setShowAddPayment(false)
    } finally {
      setSaving(false)
    }
  }

  // Agrupa contas por categoria
  const grouped = {}
  bills.forEach(b => {
    if (!grouped[b.category]) grouped[b.category] = []
    grouped[b.category].push(b)
  })

  const personLabel = (p) => p === 'tereza' ? 'Tereza' : p === 'sebastiao' ? 'Sebastião' : 'Ambos'
  const personBadge = (p) => p === 'tereza' ? 'badge-tereza' : p === 'sebastiao' ? 'badge-sebastiao' : 'badge-both'

  return (
    <div className="page-body">

      {/* ── KPIs ── */}
      <div className="grid-3 mb-24">
        <div className="metric-card" style={{ background: 'var(--grad-primary)' }}>
          <div className="metric-card-icon">🏠</div>
          <div className="metric-card-label">Total do Mês</div>
          <div className="metric-card-value">{formatBRL(grandTotal)}</div>
          <div className="metric-card-sub">Contas + Cartões + Avulsos</div>
        </div>
        <div className="metric-card" style={{ background: 'var(--grad-green)' }}>
          <div className="metric-card-icon">✅</div>
          <div className="metric-card-label">Pago</div>
          <div className="metric-card-value">{formatBRL(grandPaid)}</div>
          <div className="metric-card-sub">{grandTotal > 0 ? `${Math.round((grandPaid / grandTotal) * 100)}% quitado` : '—'}</div>
        </div>
        <div className="metric-card" style={{ background: (grandTotal - grandPaid) > 0 ? 'var(--grad-orange)' : 'var(--grad-green)' }}>
          <div className="metric-card-icon">⏳</div>
          <div className="metric-card-label">Pendente</div>
          <div className="metric-card-value">{formatBRL(grandTotal - grandPaid)}</div>
          <div className="metric-card-sub">
            {pendingCount + cards.filter(c => !isCardPaid(c.id) && (cardTotals[c.id] || 0) > 0).length} item(s) em aberto
          </div>
        </div>
      </div>

      {/* ── Progresso ── */}
      <div className="card mb-24">
        <div className="flex justify-between items-center mb-16">
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Progresso do Mês — {monthLabel(currentMonth)}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {formatBRL(grandPaid)} pagos de {formatBRL(grandTotal)}
            </div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)' }}>
            {grandTotal > 0 ? `${Math.round((grandPaid / grandTotal) * 100)}%` : '0%'}
          </div>
        </div>
        <div className="progress-bar-wrap" style={{ height: 10 }}>
          <div
            className="progress-bar-fill"
            style={{
              width: grandTotal > 0 ? `${(grandPaid / grandTotal) * 100}%` : '0%',
              background: 'var(--grad-green)',
            }}
          />
        </div>
      </div>

      {/* ════════════════════════════════════════════
          CARTÕES DE CRÉDITO
      ════════════════════════════════════════════ */}
      <div className="card mb-24">
        <div className="flex justify-between items-center mb-16">
          <div className="flex items-center gap-8">
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#6366F120', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
              💳
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Cartões de Crédito</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Faturas do mês · {cards.length} cartão(ões)
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--green)' }}>{formatBRL(totalCardPaid)} pago</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>de {formatBRL(totalCardExpected)}</div>
          </div>
        </div>

        {cards.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💳</div>
            <div className="empty-state-text">Nenhum cartão cadastrado.<br />Vá em Configurações para adicionar.</div>
          </div>
        ) : (
          cards.map(card => {
            const total      = cardTotals[card.id] || 0
            const paid       = isCardPaid(card.id)
            const paidAt     = cardPaidAt(card.id)
            const cardPerson = getCardPerson(card)

            return (
              <div
                key={card.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '14px 0', borderTop: '1px solid var(--border)',
                  flexWrap: 'wrap',
                }}
              >
                {/* Toggle pago */}
                <button
                  className={`toggle ${paid ? 'on' : 'off'}`}
                  onClick={() => toggleCardPayment(card.id, !paid)}
                  title={paid ? 'Marcar como não pago' : 'Marcar fatura como paga'}
                  disabled={total === 0}
                  style={{ opacity: total === 0 ? 0.4 : 1, flexShrink: 0 }}
                />

                {/* Ícone do banco */}
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: card.color || '#6366F1',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 800, fontSize: 13, flexShrink: 0,
                }}>
                  {card.bank?.charAt(0) || '?'}
                </div>

                {/* Nome e vencimento */}
                <div style={{ flex: 1, minWidth: 80 }}>
                  <div style={{
                    fontWeight: 600, fontSize: 14,
                    textDecoration: paid ? 'line-through' : 'none',
                    color: paid ? 'var(--text-muted)' : 'var(--text-primary)',
                  }}>
                    {card.bank} {card.brand && <span style={{ fontSize: 11, opacity: 0.7 }}>({card.brand})</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {card.dueDay ? `Vence dia ${card.dueDay}` : ''}
                    {paid && paidAt ? ` · Pago em ${new Date(paidAt).toLocaleDateString('pt-BR')}` : ''}
                    {total === 0 ? ' · Sem transações' : ''}
                  </div>
                </div>

                {/* Seletor de pessoa responsável */}
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {['tereza', 'sebastiao'].map(p => {
                    const active = cardPerson === p
                    const color  = p === 'tereza' ? '#EC4899' : '#8B5CF6'
                    return (
                      <button
                        key={p}
                        onClick={() => setCardPaymentPerson(card.id, p)}
                        title={`Atribuir fatura a ${p === 'tereza' ? 'Tereza' : 'Sebastião'}`}
                        style={{
                          padding: '3px 9px', borderRadius: 12, cursor: 'pointer',
                          border: `1.5px solid ${active ? color : 'var(--border)'}`,
                          background: active ? color + '18' : 'transparent',
                          color: active ? color : 'var(--text-muted)',
                          fontSize: 11, fontWeight: active ? 700 : 500,
                          transition: 'all 0.15s',
                        }}
                      >
                        {p === 'tereza' ? 'Tereza' : 'Sebastião'}
                      </button>
                    )
                  })}
                </div>

                {/* Valor da fatura */}
                <div style={{
                  fontWeight: 700, fontSize: 15, flexShrink: 0,
                  color: paid ? 'var(--green)' : total > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                }}>
                  {formatBRL(total)}
                </div>

                {/* Status */}
                {total > 0
                  ? paid
                    ? <span className="badge badge-green" style={{ flexShrink: 0 }}>✓ Pago</span>
                    : <span className="badge badge-orange" style={{ flexShrink: 0 }}>Pendente</span>
                  : <span className="badge" style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)', flexShrink: 0 }}>Sem fatura</span>
                }
              </div>
            )
          })
        )}
      </div>

      {/* ════════════════════════════════════════════
          CONTAS FIXAS
      ════════════════════════════════════════════ */}
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Contas Fixas</div>

      {Object.entries(grouped).map(([catId, catBills]) => {
        const catTotal = catBills.filter(b => b.active).reduce((a, b) => a + (b.amount || 0), 0)
        const catPaid  = catBills.filter(b => isPaid(b.id)).reduce((a, b) => {
          const rec = getRecord(b.id)
          return a + (rec?.amount || b.amount || 0)
        }, 0)

        return (
          <div className="card mb-16" key={catId}>
            <div className="flex justify-between items-center mb-16">
              <div className="flex items-center gap-8">
                <div style={{ width: 32, height: 32, borderRadius: 8, background: catColor(catId) + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                  {catIcon(catId)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{catLabel(catId)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {catBills.filter(b => b.active).length} contas · {formatBRL(catTotal)} previsto
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: 'var(--green)' }}>{formatBRL(catPaid)} pago</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>de {formatBRL(catTotal)}</div>
              </div>
            </div>

            {catBills.map(bill => {
              const rec        = getRecord(bill.id)
              const paid       = isPaid(bill.id)
              const currentAmt = rec?.amount !== undefined ? rec.amount : bill.amount || 0
              const inputVal   = editAmount[bill.id] !== undefined ? editAmount[bill.id] : currentAmt

              return (
                <div
                  key={bill.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 0', borderTop: '1px solid var(--border)',
                    opacity: bill.active ? 1 : 0.4,
                  }}
                >
                  <button
                    className={`toggle ${paid ? 'on' : 'off'}`}
                    onClick={() => handleToggle(bill)}
                    title={paid ? 'Marcar como não pago' : 'Marcar como pago'}
                  />

                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, textDecoration: paid ? 'line-through' : 'none', color: paid ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                      {bill.label}
                    </div>
                    <div className="flex items-center gap-8" style={{ marginTop: 3 }}>
                      {bill.person === 'tereza'    && <span className="badge badge-tereza text-sm">Tereza</span>}
                      {bill.person === 'sebastiao' && <span className="badge badge-sebastiao text-sm">Sebastião</span>}
                      {bill.person === 'both'      && <span className="badge badge-both text-sm">Ambos</span>}
                      {paid && rec?.paidAt && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          Pago em {new Date(rec.paidAt).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>R$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={inputVal}
                      onChange={e => setEditAmount(prev => ({ ...prev, [bill.id]: e.target.value }))}
                      onBlur={e => handleAmountBlur(bill, e.target.value)}
                      style={{
                        ...inputNoSpinner,
                        width: 90, padding: '4px 8px',
                        border: '1.5px solid var(--border)', borderRadius: 6,
                        fontSize: 14, fontWeight: 600, textAlign: 'right',
                        background: paid ? '#F0FDF4' : 'var(--card)',
                        color: paid ? 'var(--green)' : 'var(--text-primary)',
                      }}
                    />
                  </div>

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
        <div className="card mb-24">
          <div className="empty-state">
            <div className="empty-state-icon">🏠</div>
            <div className="empty-state-text">Nenhuma conta fixa cadastrada.<br />Vá em Configurações para adicionar.</div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          PAGAMENTOS AVULSOS
      ════════════════════════════════════════════ */}
      <div className="card mt-8">
        <div className="flex justify-between items-center mb-16">
          <div className="flex items-center gap-8">
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#10B98120', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
              💸
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Pagamentos Avulsos</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {extraPayments.length} registro(s) · {formatBRL(totalExtra)} total
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowAddPayment(v => !v)}
            style={{
              padding: '8px 16px', borderRadius: 8,
              background: 'var(--grad-primary)', color: '#fff',
              border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}
          >
            {showAddPayment ? '✕ Cancelar' : '+ Adicionar'}
          </button>
        </div>

        {showAddPayment && (
          <div style={{
            background: 'var(--bg)', borderRadius: 10, padding: 16,
            border: '1.5px solid var(--border)', marginBottom: 16,
          }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Novo Pagamento</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Descrição *</label>
                <input
                  type="text"
                  placeholder="Ex: Farmácia, IPVA, Conserto..."
                  value={newPayment.label}
                  onChange={e => setNewPayment(p => ({ ...p, label: e.target.value }))}
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 7,
                    border: '1.5px solid var(--border)', fontSize: 13,
                    background: 'var(--card)', color: 'var(--text-primary)', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Categoria *</label>
                <select
                  value={newPayment.category}
                  onChange={e => setNewPayment(p => ({ ...p, category: e.target.value }))}
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 7,
                    border: '1.5px solid var(--border)', fontSize: 13,
                    background: 'var(--card)', color: 'var(--text-primary)',
                  }}
                >
                  {GENERAL_CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Valor (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={newPayment.amount}
                  onChange={e => setNewPayment(p => ({ ...p, amount: e.target.value }))}
                  style={{
                    ...inputNoSpinner,
                    width: '100%', padding: '8px 10px', borderRadius: 7,
                    border: '1.5px solid var(--border)', fontSize: 13,
                    background: 'var(--card)', color: 'var(--text-primary)', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Responsável *</label>
                <select
                  value={newPayment.person}
                  onChange={e => setNewPayment(p => ({ ...p, person: e.target.value }))}
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 7,
                    border: '1.5px solid var(--border)', fontSize: 13,
                    background: 'var(--card)', color: 'var(--text-primary)',
                  }}
                >
                  <option value="both">Ambos</option>
                  <option value="tereza">Tereza</option>
                  <option value="sebastiao">Sebastião</option>
                </select>
              </div>
            </div>
            <button
              onClick={handleAddPayment}
              disabled={saving || !newPayment.label.trim() || !newPayment.amount}
              style={{
                width: '100%', padding: '10px', borderRadius: 8,
                background: 'var(--grad-green)', color: '#fff',
                border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                opacity: (saving || !newPayment.label.trim() || !newPayment.amount) ? 0.5 : 1,
              }}
            >
              {saving ? 'Salvando...' : '✓ Salvar Pagamento'}
            </button>
          </div>
        )}

        {extraPayments.length === 0 ? (
          <div className="empty-state" style={{ padding: '20px 0' }}>
            <div className="empty-state-icon">💸</div>
            <div className="empty-state-text">Nenhum pagamento avulso registrado este mês.</div>
          </div>
        ) : (
          extraPayments.map(ep => (
            <div
              key={ep.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 0', borderTop: '1px solid var(--border)',
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: catColor(ep.category) + '20',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0,
              }}>
                {catIcon(ep.category)}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{ep.label}</div>
                <div className="flex items-center gap-8" style={{ marginTop: 3 }}>
                  <span style={{ fontSize: 11, color: catColor(ep.category), background: catColor(ep.category) + '15', padding: '2px 6px', borderRadius: 4 }}>
                    {catLabel(ep.category)}
                  </span>
                  <span className={`badge ${personBadge(ep.person)} text-sm`}>{personLabel(ep.person)}</span>
                  {ep.createdAt && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {new Date(ep.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ fontWeight: 700, fontSize: 15, flexShrink: 0 }}>{formatBRL(ep.amount)}</div>

              <button
                onClick={() => deleteExtraPayment(ep.id)}
                title="Remover"
                style={{
                  width: 28, height: 28, borderRadius: 6, border: 'none',
                  background: '#FEE2E2', color: '#EF4444',
                  cursor: 'pointer', fontSize: 13,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

    </div>
  )
}
