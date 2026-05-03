import { useState } from 'react'
import { useFinance } from '../contexts/FinanceContext'
import { formatBRL } from '../utils/calculations'

const uid = () => Math.random().toString(36).slice(2, 9)

const CARD_BRANDS = ['Visa', 'Mastercard', 'Elo', 'American Express', 'Hipercard']
const BANKS       = ['Inter', 'Bradesco', 'Santander', 'Sofisa', 'Nubank', 'Itaú', 'C6 Bank', 'Caixa', 'Banco do Brasil', 'BTG', 'XP', 'Outro']

export default function Configuracoes() {
  const { config, saveConfig, GENERAL_CATEGORIES } = useFinance()
  const [activeTab, setActiveTab] = useState('cards')

  // ── Cartões ──────────────────────────────────────────────
  const [cards, setCards]     = useState(config.cards || [])
  const [newCard, setNewCard] = useState({ id: uid(), bank: '', brand: 'Mastercard', dueDay: 10, color: '#8B5CF6', person: 'tereza' })

  const addCard = () => {
    if (!newCard.bank) return
    const updated = [...cards, { ...newCard, id: uid() }]
    setCards(updated)
    saveConfig({ cards: updated })
    setNewCard({ id: uid(), bank: '', brand: 'Mastercard', dueDay: 10, color: '#8B5CF6', person: 'tereza' })
  }

  const removeCard = (id) => {
    const updated = cards.filter(c => c.id !== id)
    setCards(updated)
    saveConfig({ cards: updated })
  }

  // ── Contas fixas ─────────────────────────────────────────
  const [bills, setBills] = useState(config.fixedBills || [])
  const [newBill, setNewBill] = useState({ id: uid(), label: '', category: 'custos_fixos', amount: '', person: 'both', active: true })

  const addBill = () => {
    if (!newBill.label) return
    const updated = [...bills, { ...newBill, id: uid(), amount: parseFloat(newBill.amount) || 0 }]
    setBills(updated)
    saveConfig({ fixedBills: updated })
    setNewBill({ id: uid(), label: '', category: 'custos_fixos', amount: '', person: 'both', active: true })
  }

  const removeBill = (id) => {
    const updated = bills.filter(b => b.id !== id)
    setBills(updated)
    saveConfig({ fixedBills: updated })
  }

  const updateBill = (id, field, value) => {
    const updated = bills.map(b => b.id === id ? { ...b, [field]: field==='amount' ? parseFloat(value)||0 : value } : b)
    setBills(updated)
    saveConfig({ fixedBills: updated })
  }

  // ── Entradas ─────────────────────────────────────────────
  const [incomes, setIncomes]   = useState(config.incomes || [])
  const [newIncome, setNewIncome] = useState({ id: uid(), label: '', person: 'tereza', type: 'salary', amount: '', hasThirteenth: false })

  const saveIncomeAmount = (id, amount) => {
    const updated = incomes.map(i => i.id === id ? { ...i, amount: parseFloat(amount) || 0 } : i)
    setIncomes(updated)
    saveConfig({ incomes: updated })
  }

  const addIncome = () => {
    if (!newIncome.label) return
    const updated = [...incomes, { ...newIncome, id: uid(), amount: parseFloat(newIncome.amount) || 0 }]
    setIncomes(updated)
    saveConfig({ incomes: updated })
    setNewIncome({ id: uid(), label: '', person: 'tereza', type: 'salary', amount: '', hasThirteenth: false })
  }

  const removeIncome = (id) => {
    const updated = incomes.filter(i => i.id !== id)
    setIncomes(updated)
    saveConfig({ incomes: updated })
  }

  const TABS = [
    { id: 'cards',   label: '💳 Cartões',     count: cards.length },
    { id: 'bills',   label: '🏠 Contas Fixas', count: bills.length },
    { id: 'incomes', label: '💰 Entradas',     count: incomes.length },
  ]

  return (
    <div className="page-body">

      {/* ── Tabs ── */}
      <div className="flex gap-8 mb-24">
        {TABS.map(t => (
          <button key={t.id} className={`btn btn-lg ${activeTab===t.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab(t.id)}>
            {t.label}
            <span style={{ background:'rgba(255,255,255,0.2)', borderRadius:20, padding:'1px 7px', fontSize:11 }}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* ── CARTÕES ── */}
      {activeTab === 'cards' && (
        <div>
          <div className="card mb-24">
            <div className="section-title">Adicionar Cartão</div>
            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">Banco</label>
                <select className="form-select" value={newCard.bank} onChange={e => setNewCard(p => ({ ...p, bank: e.target.value }))}>
                  <option value="">— Selecionar —</option>
                  {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Bandeira</label>
                <select className="form-select" value={newCard.brand} onChange={e => setNewCard(p => ({ ...p, brand: e.target.value }))}>
                  {CARD_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Vencimento (dia)</label>
                <input className="form-input" type="number" min="1" max="28" value={newCard.dueDay}
                  onChange={e => setNewCard(p => ({ ...p, dueDay: parseInt(e.target.value)||10 }))} />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Responsável principal</label>
                <select className="form-select" value={newCard.person} onChange={e => setNewCard(p => ({ ...p, person: e.target.value }))}>
                  <option value="tereza">Tereza</option>
                  <option value="sebastiao">Sebastião</option>
                  <option value="both">Ambos</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Cor de identificação</label>
                <input className="form-input" type="color" value={newCard.color}
                  onChange={e => setNewCard(p => ({ ...p, color: e.target.value }))}
                  style={{ padding:4, height:42 }} />
              </div>
            </div>
            <button className="btn btn-primary" onClick={addCard} disabled={!newCard.bank}>➕ Adicionar Cartão</button>
          </div>

          <div className="card">
            <div className="section-title">Cartões Cadastrados</div>
            {cards.length === 0
              ? <div className="empty-state"><div className="empty-state-icon">💳</div><div className="empty-state-text">Nenhum cartão cadastrado</div></div>
              : cards.map(card => (
                <div key={card.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 0', borderTop:'1px solid var(--border)' }}>
                  <div style={{ width:44, height:28, borderRadius:6, background:card.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'#fff', fontWeight:700, flexShrink:0 }}>
                    {card.brand.slice(0,2).toUpperCase()}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600 }}>{card.bank}</div>
                    <div style={{ fontSize:12, color:'var(--text-secondary)' }}>
                      {card.brand} · Vence dia {card.dueDay}
                    </div>
                  </div>
                  {card.person === 'tereza'    && <span className="badge badge-tereza">Tereza</span>}
                  {card.person === 'sebastiao' && <span className="badge badge-sebastiao">Sebastião</span>}
                  {card.person === 'both'      && <span className="badge badge-both">Ambos</span>}
                  <button className="btn btn-sm btn-danger" onClick={() => removeCard(card.id)}>🗑</button>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* ── CONTAS FIXAS ── */}
      {activeTab === 'bills' && (
        <div>
          <div className="card mb-24">
            <div className="section-title">Adicionar Conta Fixa</div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Nome</label>
                <input className="form-input" placeholder="Ex: Conta de Luz" value={newBill.label}
                  onChange={e => setNewBill(p => ({ ...p, label: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Valor estimado (R$)</label>
                <input className="form-input" type="number" step="0.01" placeholder="0,00" value={newBill.amount}
                  onChange={e => setNewBill(p => ({ ...p, amount: e.target.value }))} />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Categoria</label>
                <select className="form-select" value={newBill.category} onChange={e => setNewBill(p => ({ ...p, category: e.target.value }))}>
                  {GENERAL_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Responsável</label>
                <select className="form-select" value={newBill.person} onChange={e => setNewBill(p => ({ ...p, person: e.target.value }))}>
                  <option value="both">Ambos (dividido)</option>
                  <option value="tereza">Tereza</option>
                  <option value="sebastiao">Sebastião</option>
                </select>
              </div>
            </div>
            <button className="btn btn-primary" onClick={addBill} disabled={!newBill.label}>➕ Adicionar Conta</button>
          </div>

          <div className="card">
            <div className="section-title">Contas Fixas</div>
            {bills.length === 0
              ? <div className="empty-state"><div className="empty-state-icon">🏠</div><div className="empty-state-text">Nenhuma conta fixa cadastrada</div></div>
              : bills.map(bill => {
                  const cat = GENERAL_CATEGORIES.find(c => c.id === bill.category)
                  return (
                    <div key={bill.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderTop:'1px solid var(--border)' }}>
                      <button className={`toggle ${bill.active ? 'on' : 'off'}`}
                        onClick={() => updateBill(bill.id, 'active', !bill.active)}
                        title={bill.active ? 'Desativar' : 'Ativar'} />
                      <div style={{ flex:1 }}>
                        <input
                          className="form-input"
                          value={bill.label}
                          onChange={e => updateBill(bill.id, 'label', e.target.value)}
                          style={{ border:'none', padding:0, fontWeight:600, fontSize:14, background:'transparent' }}
                        />
                        <div className="flex items-center gap-8 mt-4">
                          <span style={{ fontSize:11, color:cat?.color }}>{cat?.icon} {cat?.label}</span>
                          {bill.person === 'tereza'    && <span className="badge badge-tereza text-sm">Tereza</span>}
                          {bill.person === 'sebastiao' && <span className="badge badge-sebastiao text-sm">Sebastião</span>}
                          {bill.person === 'both'      && <span className="badge badge-both text-sm">Ambos</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span style={{ fontSize:12, color:'var(--text-muted)' }}>R$</span>
                        <input
                          type="number" step="0.01"
                          value={bill.amount || ''}
                          onChange={e => updateBill(bill.id, 'amount', e.target.value)}
                          style={{ width:90, padding:'4px 8px', border:'1.5px solid var(--border)', borderRadius:6, fontSize:13, fontWeight:600, textAlign:'right' }}
                        />
                      </div>
                      <button className="btn btn-sm btn-danger" onClick={() => removeBill(bill.id)}>🗑</button>
                    </div>
                  )
                })
            }
            {bills.length > 0 && (
              <div style={{ padding:'12px 0', borderTop:'2px solid var(--border)', marginTop:4, display:'flex', justifyContent:'flex-end', gap:8 }}>
                <span style={{ fontWeight:700 }}>Total mensal:</span>
                <span style={{ fontWeight:800, color:'var(--purple)' }}>
                  {formatBRL(bills.filter(b=>b.active).reduce((a,b) => a+(b.amount||0), 0))}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ENTRADAS ── */}
      {activeTab === 'incomes' && (
        <div>
          <div className="card mb-24">
            <div className="section-title">Adicionar Entrada</div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Nome / Descrição</label>
                <input className="form-input" placeholder="Ex: Freelance" value={newIncome.label}
                  onChange={e => setNewIncome(p => ({ ...p, label: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Valor mensal (R$)</label>
                <input className="form-input" type="number" step="0.01" value={newIncome.amount}
                  onChange={e => setNewIncome(p => ({ ...p, amount: e.target.value }))} />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Pessoa</label>
                <select className="form-select" value={newIncome.person} onChange={e => setNewIncome(p => ({ ...p, person: e.target.value }))}>
                  <option value="tereza">Tereza</option>
                  <option value="sebastiao">Sebastião</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tem 13º salário?</label>
                <select className="form-select" value={newIncome.hasThirteenth ? 'yes' : 'no'}
                  onChange={e => setNewIncome(p => ({ ...p, hasThirteenth: e.target.value === 'yes' }))}>
                  <option value="yes">Sim</option>
                  <option value="no">Não</option>
                </select>
              </div>
            </div>
            <button className="btn btn-primary" onClick={addIncome} disabled={!newIncome.label}>➕ Adicionar Entrada</button>
          </div>

          <div className="card">
            <div className="section-title">Entradas Cadastradas</div>
            {incomes.length === 0
              ? <div className="empty-state"><div className="empty-state-icon">💰</div><div className="empty-state-text">Nenhuma entrada cadastrada</div></div>
              : incomes.map(inc => (
                <div key={inc.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderTop:'1px solid var(--border)' }}>
                  <div className="avatar" style={{ background: inc.person==='tereza' ? 'var(--pink)' : 'var(--purple)', width:32, height:32, fontSize:12, flexShrink:0 }}>
                    {inc.person==='tereza' ? 'T' : 'S'}
                  </div>
                  <div style={{ flex:1 }}>
                    <input
                      className="form-input"
                      value={inc.label}
                      onChange={e => {
                        const updated = incomes.map(i => i.id===inc.id ? { ...i, label:e.target.value } : i)
                        setIncomes(updated)
                        saveConfig({ incomes: updated })
                      }}
                      style={{ border:'none', padding:0, fontWeight:600, fontSize:14, background:'transparent' }}
                    />
                    {inc.hasThirteenth && <span className="badge badge-orange text-sm">13º salário</span>}
                  </div>
                  <div className="flex items-center gap-4">
                    <span style={{ fontSize:12, color:'var(--text-muted)' }}>R$</span>
                    <input
                      type="number" step="0.01"
                      value={inc.amount || ''}
                      onChange={e => saveIncomeAmount(inc.id, e.target.value)}
                      style={{ width:100, padding:'4px 8px', border:'1.5px solid var(--border)', borderRadius:6, fontSize:13, fontWeight:600, textAlign:'right' }}
                    />
                    <span style={{ fontSize:12, color:'var(--text-muted)' }}>/mês</span>
                  </div>
                  <button className="btn btn-sm btn-danger" onClick={() => removeIncome(inc.id)}>🗑</button>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  )
}
