import { useState } from 'react'
import { useFinance } from '../contexts/FinanceContext'
import { formatBRL, monthLabel } from '../utils/calculations'

export default function Entradas() {
  const { config, monthData, currentMonth, saveConfig, saveIncome } = useFinance()
  const [editSalary, setEditSalary] = useState({})
  const [editReceived, setEditReceived] = useState({})

  const incomes  = config.incomes || []
  const recorded = monthData.incomes || []

  const getRecord = (id) => recorded.find(r => r.id === id)

  const now       = new Date()
  const isDecember = parseInt(currentMonth.split('-')[1]) === 12

  // Totais
  const totalTereza    = incomes.filter(i=>i.person==='tereza').reduce((a,i) => a + (i.amount||0), 0)
  const totalSebastiao = incomes.filter(i=>i.person==='sebastiao').reduce((a,i) => a + (i.amount||0), 0)

  // 13º
  const thirteenthT = incomes.filter(i=>i.person==='tereza' && i.hasThirteenth).reduce((a,i) => a+(i.amount||0), 0)
  const thirteenthS = incomes.filter(i=>i.person==='sebastiao' && i.hasThirteenth).reduce((a,i) => a+(i.amount||0), 0)

  // Recebido no mês
  const receivedTereza    = recorded.filter(r => incomes.find(i=>i.id===r.id && i.person==='tereza')).reduce((a,r) => a+(r.amount||0), 0)
  const receivedSebastiao = recorded.filter(r => incomes.find(i=>i.id===r.id && i.person==='sebastiao')).reduce((a,r) => a+(r.amount||0), 0)

  const saveAmountEdit = async (incomeId, newAmount) => {
    const updated = (config.incomes || []).map(i =>
      i.id === incomeId ? { ...i, amount: parseFloat(newAmount) || 0 } : i
    )
    await saveConfig({ incomes: updated })
  }

  const toggleReceived = async (inc) => {
    const rec = getRecord(inc.id)
    const nowReceived = !(rec?.received)
    const amount = editReceived[inc.id] !== undefined
      ? parseFloat(editReceived[inc.id]) || inc.amount
      : rec?.amount || inc.amount
    await saveIncome(inc.id, nowReceived, amount)
  }

  const tereza    = incomes.filter(i => i.person === 'tereza')
  const sebastiao = incomes.filter(i => i.person === 'sebastiao')

  const PersonBlock = ({ person, items, color, avatar, total, thirteenth, received }) => (
    <div className="card">
      <div className="flex items-center justify-between mb-20">
        <div className="flex items-center gap-12">
          <div className="avatar" style={{ background: color, width:40, height:40, fontSize:16 }}>{avatar}</div>
          <div>
            <div style={{ fontWeight:800, fontSize:16 }}>{person}</div>
            <div style={{ fontSize:12, color:'var(--text-secondary)' }}>
              Renda base: {formatBRL(total)}
              {isDecember && thirteenth > 0 && ` + 13º ${formatBRL(thirteenth)}`}
            </div>
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontWeight:700, color:'var(--green)', fontSize:18 }}>{formatBRL(received)}</div>
          <div style={{ fontSize:11, color:'var(--text-secondary)' }}>recebido este mês</div>
        </div>
      </div>

      {items.map(inc => {
        const rec       = getRecord(inc.id)
        const isReceived = rec?.received === true
        const currentAmt = rec?.amount || inc.amount || 0

        return (
          <div key={inc.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderTop:'1px solid var(--border)' }}>
            <button
              className={`toggle ${isReceived ? 'on' : 'off'}`}
              onClick={() => toggleReceived(inc)}
              title={isReceived ? 'Desmarcar recebimento' : 'Marcar como recebido'}
            />

            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600, fontSize:14 }}>{inc.label}</div>
              <div className="flex items-center gap-8 mt-8">
                {inc.hasThirteenth && <span className="badge badge-orange text-sm">13º salário</span>}
                {isReceived && rec?.recordedAt && (
                  <span style={{ fontSize:11, color:'var(--text-muted)' }}>
                    Recebido em {new Date(rec.recordedAt).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>
            </div>

            {/* Salário base (editável nas configurações — aqui é readonly) */}
            <div style={{ textAlign:'right' }}>
              <div style={{ fontWeight:700, fontSize:15, color: isReceived ? 'var(--green)' : 'var(--text-primary)' }}>
                {formatBRL(inc.amount)}
              </div>
              <div style={{ fontSize:11, color:'var(--text-muted)' }}>
                {isReceived ? '✓ Recebido' : 'Aguardando'}
              </div>
            </div>

            {isReceived
              ? <span className="badge badge-green">✓</span>
              : <span className="badge badge-gray">—</span>
            }
          </div>
        )
      })}

      {isDecember && (
        <div className="insight-card info mt-16">
          <div className="insight-icon">🎁</div>
          <div>
            <div className="insight-title">Dezembro — 13º Salário</div>
            <div className="insight-msg">
              {items.filter(i=>i.hasThirteenth).map(i=>i.label).join(', ')} têm 13º.
              Valor estimado: {formatBRL(thirteenth)}
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="page-body">

      {/* ── KPIs ── */}
      <div className="grid-4 mb-24">
        <div className="metric-card" style={{ background:'var(--grad-primary)' }}>
          <div className="metric-card-icon">💰</div>
          <div className="metric-card-label">Total Entradas</div>
          <div className="metric-card-value">{formatBRL(totalTereza + totalSebastiao)}</div>
          <div className="metric-card-sub">Renda combinada</div>
        </div>
        <div className="metric-card" style={{ background:'var(--grad-red)' }}>
          <div className="metric-card-icon">T</div>
          <div className="metric-card-label">Tereza</div>
          <div className="metric-card-value">{formatBRL(totalTereza)}</div>
          <div className="metric-card-sub">Renda mensal base</div>
        </div>
        <div className="metric-card" style={{ background:'var(--grad-blue)' }}>
          <div className="metric-card-icon">S</div>
          <div className="metric-card-label">Sebastião</div>
          <div className="metric-card-value">{formatBRL(totalSebastiao)}</div>
          <div className="metric-card-sub">Renda mensal base</div>
        </div>
        <div className="metric-card" style={{ background:'var(--grad-green)' }}>
          <div className="metric-card-icon">🎁</div>
          <div className="metric-card-label">13º (Dez)</div>
          <div className="metric-card-value">{formatBRL(thirteenthT + thirteenthS)}</div>
          <div className="metric-card-sub">Estimativa combinada</div>
        </div>
      </div>

      {/* ── Aviso configuração ── */}
      {(totalTereza === 0 && totalSebastiao === 0) && (
        <div className="insight-card warning mb-24">
          <div className="insight-icon">💡</div>
          <div>
            <div className="insight-title">Configure os salários</div>
            <div className="insight-msg">Vá em Configurações → Entradas para definir os valores mensais de cada pessoa.</div>
          </div>
        </div>
      )}

      {/* ── Cards por pessoa ── */}
      <div className="grid-2 gap-24">
        <PersonBlock
          person="Tereza"
          items={tereza}
          color="var(--pink)"
          avatar="T"
          total={totalTereza}
          thirteenth={thirteenthT}
          received={receivedTereza}
        />
        <PersonBlock
          person="Sebastião"
          items={sebastiao}
          color="var(--purple)"
          avatar="S"
          total={totalSebastiao}
          thirteenth={thirteenthS}
          received={receivedSebastiao}
        />
      </div>

      {/* ── Comparação mês ── */}
      <div className="card mt-24">
        <div className="section-title">📊 Recebido vs Esperado — {monthLabel(currentMonth)}</div>
        {incomes.map(inc => {
          const rec = getRecord(inc.id)
          const received = rec?.received ? (rec.amount || inc.amount) : 0
          const expected = inc.amount || 0
          const pct = expected > 0 ? Math.min((received/expected)*100, 100) : 0
          return (
            <div key={inc.id} style={{ marginBottom:16 }}>
              <div className="flex justify-between items-center" style={{ marginBottom:6 }}>
                <div className="flex items-center gap-8">
                  <div className="avatar" style={{
                    background: inc.person==='tereza' ? 'var(--pink)' : 'var(--purple)',
                    width:20, height:20, fontSize:10
                  }}>
                    {inc.person==='tereza' ? 'T' : 'S'}
                  </div>
                  <span style={{ fontWeight:500, fontSize:13 }}>{inc.label}</span>
                </div>
                <span style={{ fontWeight:700, fontSize:13 }}>
                  {formatBRL(received)} / {formatBRL(expected)}
                </span>
              </div>
              <div className="progress-bar-wrap">
                <div className="progress-bar-fill" style={{
                  width: `${pct}%`,
                  background: inc.person==='tereza' ? 'var(--pink)' : 'var(--purple)',
                }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
