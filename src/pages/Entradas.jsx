import { useState } from 'react'
import { useFinance } from '../contexts/FinanceContext'
import { formatBRL, monthLabel } from '../utils/calculations'

export default function Entradas() {
  const { config, monthData, currentMonth, saveIncome } = useFinance()
  const [editAmounts, setEditAmounts] = useState({})   // id → string em edição

  const incomes  = config.incomes || []
  const recorded = monthData.incomes || []

  const getRecord  = (id) => recorded.find(r => r.id === id)
  const isReceived = (id) => getRecord(id)?.received === true

  const currentMonthNum = parseInt(currentMonth.split('-')[1])

  // Retorna valor real do mês (salvo no Firebase) ou base da config
  const getRealAmount = (inc) => {
    const rec = getRecord(inc.id)
    return rec?.amount ?? inc.amount ?? 0
  }

  // Retorna string para exibir no input: edição em andamento > valor real salvo > vazio
  const getDisplayAmt = (inc) => {
    if (editAmounts[inc.id] !== undefined) return editAmounts[inc.id]
    const rec = getRecord(inc.id)
    const val = rec?.amount ?? inc.amount ?? ''
    return val === '' ? '' : String(val)
  }

  // Totais reais do mês (valores digitados/salvos no Firebase)
  const realT = incomes.filter(i => i.person === 'tereza').reduce((a, i) => a + getRealAmount(i), 0)
  const realS = incomes.filter(i => i.person === 'sebastiao').reduce((a, i) => a + getRealAmount(i), 0)

  // 13º este mês (com valor real)
  const thirteenthT = incomes
    .filter(i => i.person === 'tereza' && i.hasThirteenth && (i.thirteenthMonth || 12) === currentMonthNum)
    .reduce((a, i) => a + getRealAmount(i), 0)
  const thirteenthS = incomes
    .filter(i => i.person === 'sebastiao' && i.hasThirteenth && (i.thirteenthMonth || 12) === currentMonthNum)
    .reduce((a, i) => a + getRealAmount(i), 0)

  // Recebido no mês — só entradas marcadas como received:true
  const recT = recorded
    .filter(r => r.received === true && incomes.find(i => i.id === r.id && i.person === 'tereza'))
    .reduce((a, r) => a + (r.amount || 0), 0)
  const recS = recorded
    .filter(r => r.received === true && incomes.find(i => i.id === r.id && i.person === 'sebastiao'))
    .reduce((a, r) => a + (r.amount || 0), 0)

  // Parseia string digitada aceitando vírgula ou ponto como separador decimal
  const parseAmt = (str) => parseFloat(String(str).replace(',', '.')) || 0

  // Toggle recebido (preserva o valor já digitado)
  const handleToggle = async (inc) => {
    const rec    = getRecord(inc.id)
    const nowRec = !isReceived(inc.id)
    const amount = editAmounts[inc.id] !== undefined
      ? parseAmt(editAmounts[inc.id])
      : (rec?.amount ?? inc.amount ?? 0)
    await saveIncome(inc.id, nowRec, amount)
  }

  // Salvar valor ao sair do campo (independente do toggle)
  const handleAmountBlur = async (inc) => {
    const raw = editAmounts[inc.id]
    if (raw === undefined) return
    const val = parseAmt(raw)
    await saveIncome(inc.id, isReceived(inc.id), val)
    setEditAmounts(p => { const n = { ...p }; delete n[inc.id]; return n })
  }

  const tereza    = incomes.filter(i => i.person === 'tereza')
  const sebastiao = incomes.filter(i => i.person === 'sebastiao')

  const PersonBlock = ({ personLabel, items, color, avatar, real, thirteenth, received }) => (
    <div className="card">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-20">
        <div className="flex items-center gap-12">
          <div className="avatar" style={{ background: color, width: 40, height: 40, fontSize: 16 }}>{avatar}</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{personLabel}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Lançado: {formatBRL(real)}
              {thirteenth > 0 && ` · 13º: ${formatBRL(thirteenth)}`}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 700, color: 'var(--green)', fontSize: 18 }}>{formatBRL(received)}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>recebido este mês</div>
        </div>
      </div>

      {items.map(inc => {
        const rec          = getRecord(inc.id)
        const recv         = isReceived(inc.id)
        const displayAmt   = getDisplayAmt(inc)
        const isThirteenth = inc.hasThirteenth && (inc.thirteenthMonth || 12) === currentMonthNum

        return (
          <div key={inc.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 0', borderTop: '1px solid var(--border)', flexWrap: 'wrap'
            }}
          >
            {/* Toggle recebido */}
            <button
              className={`toggle ${recv ? 'on' : 'off'}`}
              onClick={() => handleToggle(inc)}
              title={recv ? 'Desmarcar recebimento' : 'Marcar como recebido'}
            />

            {/* Info */}
            <div style={{ flex: 1, minWidth: 120 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{inc.label}</div>
              <div className="flex items-center gap-6 mt-4" style={{ flexWrap: 'wrap' }}>
                {inc.hasThirteenth && (
                  <span className="badge badge-orange" style={{ fontSize: 10 }}>
                    13º {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][(inc.thirteenthMonth || 12) - 1]}
                  </span>
                )}
                {isThirteenth && <span className="badge badge-green" style={{ fontSize: 10 }}>+13º este mês</span>}
                {recv && rec?.recordedAt && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Recebido em {new Date(rec.recordedAt).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>
            </div>

            {/* Input de valor — type="text" para digitação livre sem setas */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>R$</span>
              <input
                type="text"
                inputMode="decimal"
                value={displayAmt}
                placeholder="0.00"
                onChange={e => setEditAmounts(p => ({ ...p, [inc.id]: e.target.value }))}
                onBlur={() => handleAmountBlur(inc)}
                onFocus={e => e.target.style.borderColor = 'var(--purple)'}
                style={{
                  width: 110,
                  padding: '5px 8px',
                  border: '1.5px solid var(--border)',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 700,
                  textAlign: 'right',
                  background: recv ? '#F0FDF4' : 'var(--card)',
                  color: recv ? 'var(--green)' : 'var(--text-primary)',
                  transition: 'border-color 0.15s',
                  outline: 'none',
                }}
              />
            </div>

            {recv
              ? <span className="badge badge-green">✓</span>
              : <span className="badge badge-gray">—</span>
            }
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="page-body">

      {/* ── KPIs ── */}
      <div className="grid-4 mb-24">
        <div className="metric-card" style={{ background: 'var(--grad-primary)' }}>
          <div className="metric-card-icon">💰</div>
          <div className="metric-card-label">Total Entradas</div>
          <div className="metric-card-value">{formatBRL(realT + realS)}</div>
          <div className="metric-card-sub">Lançado este mês</div>
        </div>
        <div className="metric-card" style={{ background: 'var(--grad-red)' }}>
          <div className="metric-card-icon">T</div>
          <div className="metric-card-label">Tereza</div>
          <div className="metric-card-value">{formatBRL(realT)}</div>
          <div className="metric-card-sub">Lançado este mês</div>
        </div>
        <div className="metric-card" style={{ background: 'var(--grad-blue)' }}>
          <div className="metric-card-icon">S</div>
          <div className="metric-card-label">Sebastião</div>
          <div className="metric-card-value">{formatBRL(realS)}</div>
          <div className="metric-card-sub">Lançado este mês</div>
        </div>
        <div className="metric-card" style={{ background: 'var(--grad-green)' }}>
          <div className="metric-card-icon">🎁</div>
          <div className="metric-card-label">13º este mês</div>
          <div className="metric-card-value">{formatBRL(thirteenthT + thirteenthS)}</div>
          <div className="metric-card-sub">{monthLabel(currentMonth)}</div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-16">
        <div style={{ fontWeight: 700, fontSize: 15 }}>Entradas — {monthLabel(currentMonth)}</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          💡 Digite o valor exato recebido e marque o toggle ao confirmar
        </div>
      </div>

      {/* ── Cards por pessoa ── */}
      <div className="grid-2 gap-24">
        <PersonBlock
          personLabel="Tereza"     items={tereza}
          color="var(--pink)"      avatar="T"
          real={realT}             thirteenth={thirteenthT}   received={recT}
        />
        <PersonBlock
          personLabel="Sebastião"  items={sebastiao}
          color="var(--purple)"    avatar="S"
          real={realS}             thirteenth={thirteenthS}   received={recS}
        />
      </div>

      {/* ── Recebido vs Esperado ── */}
      <div className="card mt-24">
        <div className="section-title">📊 Recebido vs Lançado — {monthLabel(currentMonth)}</div>
        {incomes.map(inc => {
          const rec      = getRecord(inc.id)
          const recvAmt  = rec?.received ? (rec.amount ?? inc.amount) : 0
          const expected = rec?.amount ?? inc.amount ?? 0
          const pct      = expected > 0 ? Math.min((recvAmt / expected) * 100, 100) : 0
          return (
            <div key={inc.id} style={{ marginBottom: 16 }}>
              <div className="flex justify-between items-center" style={{ marginBottom: 6 }}>
                <div className="flex items-center gap-8">
                  <div className="avatar" style={{
                    background: inc.person === 'tereza' ? 'var(--pink)' : 'var(--purple)',
                    width: 20, height: 20, fontSize: 10
                  }}>
                    {inc.person === 'tereza' ? 'T' : 'S'}
                  </div>
                  <span style={{ fontWeight: 500, fontSize: 13 }}>{inc.label}</span>
                </div>
                <span style={{ fontWeight: 700, fontSize: 13 }}>
                  {formatBRL(recvAmt)} / {formatBRL(expected)}
                </span>
              </div>
              <div className="progress-bar-wrap">
                <div className="progress-bar-fill" style={{
                  width: `${pct}%`,
                  background: inc.person === 'tereza' ? 'var(--pink)' : 'var(--purple)',
                }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
