import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  collection, doc, getDocs, setDoc, updateDoc,
  onSnapshot,
} from 'firebase/firestore'
import { db } from '../firebase/config'

const FinanceContext = createContext(null)

const toMonthKey = (date) => {
  const d = date instanceof Date ? date : new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export const GENERAL_CATEGORIES = [
  { id: 'custos_fixos_essenciais', label: 'Custos Fixos Essenciais', color: '#EF4444', icon: '🏠' },
  { id: 'vida_facilitada',         label: 'Vida Facilitada',         color: '#8B5CF6', icon: '✨' },
  { id: 'prazer_lazer',            label: 'Prazer & Lazer',          color: '#EC4899', icon: '🎉' },
  { id: 'metas_sonhos',            label: 'Metas & Sonhos',          color: '#06B6D4', icon: '🌟' },
  { id: 'liberdade_financeira',    label: 'Liberdade Financeira',    color: '#10B981', icon: '📈' },
  { id: 'conhecimento',            label: 'Conhecimento',            color: '#3B82F6', icon: '📚' },
]

// Mapeamento subcategoria → categoria principal
export const SUBCATEGORY_TO_MAIN = {
  // Custos Fixos Essenciais
  supermercado: 'custos_fixos_essenciais',
  carro: 'custos_fixos_essenciais',
  seguros: 'custos_fixos_essenciais',
  plano_celular: 'custos_fixos_essenciais',
  // Vida Facilitada
  assinaturas: 'vida_facilitada',
  transporte_app: 'vida_facilitada',
  casa_utensilios: 'vida_facilitada',
  farmacia: 'vida_facilitada',
  beleza_estetica: 'vida_facilitada',
  pets: 'vida_facilitada',
  // Prazer & Lazer
  restaurantes: 'prazer_lazer',
  ecommerce: 'prazer_lazer',
  vestuario: 'prazer_lazer',
  // Metas & Sonhos
  viagem: 'metas_sonhos',
  presentes: 'metas_sonhos',
  // Liberdade Financeira
  investimentos: 'liberdade_financeira',
  // Conhecimento
  educacao: 'conhecimento',
  // Compatibilidade com IDs antigos
  assinaturas_card: 'vida_facilitada',
  'casa_utensílios': 'vida_facilitada',
  beleza_lazer: 'prazer_lazer',
  inv_viagem: 'metas_sonhos',
  custos_fixos: 'custos_fixos_essenciais',
  manutencao: 'custos_fixos_essenciais',
  saude: 'vida_facilitada',
  imposto_renda: 'custos_fixos_essenciais',
  saque: 'custos_fixos_essenciais',
  diversos: 'custos_fixos_essenciais',
  // Categorias principais mapeiam para si mesmas
  custos_fixos_essenciais: 'custos_fixos_essenciais',
  vida_facilitada: 'vida_facilitada',
  prazer_lazer: 'prazer_lazer',
  metas_sonhos: 'metas_sonhos',
  liberdade_financeira: 'liberdade_financeira',
  conhecimento: 'conhecimento',
}

export const CARD_CATEGORIES = [
  // 🏠 Custos Fixos Essenciais
  { id: 'supermercado',   label: 'Supermercado',        color: '#10B981', icon: '🛒', mainCategory: 'custos_fixos_essenciais' },
  { id: 'carro',          label: 'Carro',               color: '#F97316', icon: '🚗', mainCategory: 'custos_fixos_essenciais' },
  { id: 'seguros',        label: 'Seguros',             color: '#EF4444', icon: '🛡️', mainCategory: 'custos_fixos_essenciais' },
  { id: 'plano_celular',  label: 'Plano Celular',       color: '#6366F1', icon: '📱', mainCategory: 'custos_fixos_essenciais' },
  // ✨ Vida Facilitada
  { id: 'assinaturas',    label: 'Assinaturas',         color: '#8B5CF6', icon: '📺', mainCategory: 'vida_facilitada' },
  { id: 'transporte_app', label: 'Transporte por app',  color: '#0EA5E9', icon: '🚕', mainCategory: 'vida_facilitada' },
  { id: 'casa_utensilios',label: 'Casa & Utensílios',   color: '#64748B', icon: '🏠', mainCategory: 'vida_facilitada' },
  { id: 'farmacia',       label: 'Farmácia',            color: '#14B8A6', icon: '💊', mainCategory: 'vida_facilitada' },
  { id: 'beleza_estetica',label: 'Beleza & Estética',   color: '#D946EF', icon: '💅', mainCategory: 'vida_facilitada' },
  { id: 'pets',           label: 'Pets',                color: '#84CC16', icon: '🐾', mainCategory: 'vida_facilitada' },
  // 🎉 Prazer & Lazer
  { id: 'restaurantes',   label: 'Lanches/Restaurantes',color: '#F59E0B', icon: '🍔', mainCategory: 'prazer_lazer' },
  { id: 'ecommerce',      label: 'E-commerce',          color: '#3B82F6', icon: '📦', mainCategory: 'prazer_lazer' },
  { id: 'vestuario',      label: 'Vestuário',           color: '#EC4899', icon: '👗', mainCategory: 'prazer_lazer' },
  // 🌟 Metas & Sonhos
  { id: 'viagem',         label: 'Viagem',              color: '#06B6D4', icon: '✈️', mainCategory: 'metas_sonhos' },
  { id: 'presentes',      label: 'Presentes e Doações', color: '#EF4444', icon: '🎁', mainCategory: 'metas_sonhos' },
  // 📈 Liberdade Financeira
  { id: 'investimentos',  label: 'Valor Investido',     color: '#10B981', icon: '📈', mainCategory: 'liberdade_financeira' },
  // 📚 Conhecimento
  { id: 'educacao',       label: 'Educação',            color: '#3B82F6', icon: '📚', mainCategory: 'conhecimento' },
]

export const PESSOAS = [
  { id: 'tereza',    label: 'Tereza',    color: '#EC4899', avatar: 'T' },
  { id: 'sebastiao', label: 'Sebastião', color: '#8B5CF6', avatar: 'S' },
]

export const DEFAULT_SUB_CATEGORIES = [
  { id: 'streaming',     label: 'Streaming',              icon: '📺', color: '#E50914' },
  { id: 'carreira',      label: 'Carreira',               icon: '💼', color: '#0077B5' },
  { id: 'educacao_sub',  label: 'Educação',               icon: '📚', color: '#3B82F6' },
  { id: 'viagem',        label: 'Viagem',                 icon: '✈️',  color: '#06B6D4' },
  { id: 'armazenamento', label: 'Armazenamento em Nuvem', icon: '☁️',  color: '#8B5CF6' },
  { id: 'ia',            label: 'IA',                     icon: '🤖', color: '#10B981' },
]

export const DEFAULT_BENEFIT_CARDS = [
  { id: 'flash',  label: 'Flash',  icon: '⚡', color: '#FF6B35' },
  { id: 'ticket', label: 'Ticket', icon: '🎫', color: '#0068B4' },
]

export const DEFAULT_BENEFIT_CATEGORIES = [
  { id: 'ben_carro',        label: 'Carro',             icon: '🚗', color: '#F97316' },
  { id: 'ben_supermercado', label: 'Supermercado',      icon: '🛒', color: '#10B981' },
  { id: 'ben_restaurante',  label: 'Restaurante/iFood', icon: '🍔', color: '#F59E0B' },
  { id: 'ben_farmacia',     label: 'Farmácia',          icon: '💊', color: '#14B8A6' },
  { id: 'ben_beleza',       label: 'Beleza',            icon: '💅', color: '#EC4899' },
]

const DEFAULT_CONFIG = {
  cards: [
    { id: 'inter',     bank: 'Inter',     brand: 'Mastercard', dueDay: 10, color: '#FF6600', person: 'tereza' },
    { id: 'bradesco',  bank: 'Bradesco',  brand: 'Visa',       dueDay: 15, color: '#CC0000', person: 'tereza' },
    { id: 'santander', bank: 'Santander', brand: 'Mastercard', dueDay: 20, color: '#CC0000', person: 'sebastiao' },
    { id: 'sofisa',    bank: 'Sofisa',    brand: 'Mastercard', dueDay: 5,  color: '#00A859', person: 'tereza' },
  ],
  incomes: [
    { id: 'tereza_clt',        label: 'Tereza CLT',              person: 'tereza',    type: 'salary', amount: 0, hasThirteenth: true },
    { id: 'sebastiao_clt',     label: 'Sebastião CLT',           person: 'sebastiao', type: 'salary', amount: 0, hasThirteenth: true },
    { id: 'sebastiao_pensao',  label: 'Sebastião Pensão',        person: 'sebastiao', type: 'other',  amount: 0, hasThirteenth: false },
    { id: 'sebastiao_aposent', label: 'Sebastião Aposentadoria', person: 'sebastiao', type: 'other',  amount: 0, hasThirteenth: true },
  ],
  fixedBills: [
    { id: 'aluguel',     label: 'Aluguel/Condomínio', category: 'custos_fixos_essenciais', amount: 0, person: 'both',      active: true },
    { id: 'luz',         label: 'Luz',                category: 'custos_fixos_essenciais', amount: 0, person: 'both',      active: true },
    { id: 'agua',        label: 'Água',               category: 'custos_fixos_essenciais', amount: 0, person: 'both',      active: true },
    { id: 'internet',    label: 'Internet',           category: 'vida_facilitada', amount: 0, person: 'both',      active: true },
    { id: 'cel_tereza',  label: 'Celular Tereza',     category: 'vida_facilitada', amount: 0, person: 'tereza',    active: true },
    { id: 'cel_sebas',   label: 'Celular Sebastião',  category: 'vida_facilitada', amount: 0, person: 'sebastiao', active: true },
    { id: 'netflix',     label: 'Netflix',            category: 'vida_facilitada', amount: 0, person: 'tereza',    active: true },
    { id: 'spotify',     label: 'Spotify',            category: 'vida_facilitada', amount: 0, person: 'tereza',    active: true },
    { id: 'seguro_auto', label: 'Seguro do Carro',    category: 'custos_fixos_essenciais', amount: 0, person: 'both',      active: true },
    { id: 'plano_saude', label: 'Plano de Saúde',     category: 'vida_facilitada', amount: 0, person: 'both',      active: true },
  ],
  goals: {
    tereza:    { custos_fixos_essenciais: 35, vida_facilitada: 20, prazer_lazer: 15, metas_sonhos: 10, liberdade_financeira: 15, conhecimento: 5 },
    sebastiao: { custos_fixos_essenciais: 35, vida_facilitada: 20, prazer_lazer: 15, metas_sonhos: 10, liberdade_financeira: 15, conhecimento: 5 },
  },
  subscriptions:          [],
  subscriptionCategories: DEFAULT_SUB_CATEGORIES,
  benefitCards:           DEFAULT_BENEFIT_CARDS,
  benefitCategories:      DEFAULT_BENEFIT_CATEGORIES,
}

export function FinanceProvider({ children }) {
  const [config, setConfig]             = useState(DEFAULT_CONFIG)
  const [currentMonth, setCurrentMonth] = useState(toMonthKey(new Date()))
  const [monthData, setMonthData]       = useState({})
  const [allMonths, setAllMonths]       = useState({})
  const [loading, setLoading]           = useState(true)
  const [configReady, setConfigReady]   = useState(false)

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'main'), (snap) => {
      if (snap.exists()) {
        setConfig(prev => ({ ...DEFAULT_CONFIG, ...snap.data() }))
      } else {
        setDoc(doc(db, 'config', 'main'), DEFAULT_CONFIG)
      }
      setConfigReady(true)
    })
    return unsub
  }, [])

  useEffect(() => {
    if (!configReady) return
    const unsub = onSnapshot(doc(db, 'months', currentMonth), (snap) => {
      if (snap.exists()) {
        setMonthData(snap.data())
      } else {
        const initial = {
          fixedBills: [], transactions: [], incomes: [],
          benefitDeposits: [], benefitExpenses: [],
          cardPayments: [], extraPayments: [],
          createdAt: new Date().toISOString(),
        }
        setDoc(doc(db, 'months', currentMonth), initial)
        setMonthData(initial)
      }
      setLoading(false)
    })
    return unsub
  }, [currentMonth, configReady])

  useEffect(() => {
    if (!configReady) return
    getDocs(collection(db, 'months')).then(snap => {
      const data = {}
      snap.forEach(d => { data[d.id] = d.data() })
      setAllMonths(data)
    })
  }, [configReady, currentMonth])

  // ── Mantém allMonths sincronizado com o mês atual (monthData é realtime via onSnapshot) ──
  useEffect(() => {
    if (!currentMonth || !monthData || Object.keys(monthData).length === 0) return
    setAllMonths(prev => ({ ...prev, [currentMonth]: monthData }))
  }, [monthData, currentMonth])

  // ── CONFIG ──
  const saveConfig = useCallback(async (updates) => {
    const newCfg = { ...config, ...updates }
    await setDoc(doc(db, 'config', 'main'), newCfg)
    setConfig(newCfg)
  }, [config])

  // ── CONTAS FIXAS ──
  const toggleFixedBill = useCallback(async (billId, paid, paidAmount) => {
    const bills = [...(monthData.fixedBills || [])]
    const idx = bills.findIndex(b => b.id === billId)
    const entry = { id: billId, paid, amount: paidAmount, paidAt: paid ? new Date().toISOString() : null }
    if (idx >= 0) bills[idx] = entry
    else bills.push(entry)
    await updateDoc(doc(db, 'months', currentMonth), { fixedBills: bills })
  }, [monthData, currentMonth])

  // ── PAGAMENTO DE CARTÃO ──
  const toggleCardPayment = useCallback(async (cardId, paid) => {
    const payments = [...(monthData.cardPayments || [])]
    const idx = payments.findIndex(p => p.cardId === cardId)
    const existing = payments[idx] || {}
    const entry = { ...existing, cardId, paid, paidAt: paid ? new Date().toISOString() : null }
    if (idx >= 0) payments[idx] = entry
    else payments.push(entry)
    await updateDoc(doc(db, 'months', currentMonth), { cardPayments: payments })
  }, [monthData, currentMonth])

  // Define (ou altera) a pessoa responsável pelo pagamento da fatura do cartão neste mês
  const setCardPaymentPerson = useCallback(async (cardId, person) => {
    const payments = [...(monthData.cardPayments || [])]
    const idx = payments.findIndex(p => p.cardId === cardId)
    if (idx >= 0) {
      payments[idx] = { ...payments[idx], person }
    } else {
      payments.push({ cardId, paid: false, paidAt: null, person })
    }
    await updateDoc(doc(db, 'months', currentMonth), { cardPayments: payments })
  }, [monthData, currentMonth])

  // ── PAGAMENTOS AVULSOS ──
  const saveExtraPayment = useCallback(async (payment) => {
    const list = [...(monthData.extraPayments || [])]
    const idx = list.findIndex(p => p.id === payment.id)
    if (idx >= 0) list[idx] = payment
    else list.push(payment)
    await updateDoc(doc(db, 'months', currentMonth), { extraPayments: list })
  }, [monthData, currentMonth])

  const deleteExtraPayment = useCallback(async (paymentId) => {
    const list = (monthData.extraPayments || []).filter(p => p.id !== paymentId)
    await updateDoc(doc(db, 'months', currentMonth), { extraPayments: list })
  }, [monthData, currentMonth])

  // ── TRANSAÇÕES ──
  const saveTransactions = useCallback(async (transactions, monthKey) => {
    const key = monthKey || currentMonth
    const existing = allMonths[key]?.transactions || []
    const map = {}
    existing.forEach(t => { map[t.id] = t })
    transactions.forEach(t => { map[t.id] = t })
    const merged = Object.values(map)
    await updateDoc(doc(db, 'months', key), { transactions: merged }).catch(() =>
      setDoc(doc(db, 'months', key), { transactions: merged, fixedBills: [], incomes: [], benefitDeposits: [], benefitExpenses: [], cardPayments: [], extraPayments: [] })
    )
    setAllMonths(prev => ({ ...prev, [key]: { ...prev[key], transactions: merged } }))
  }, [currentMonth, allMonths])

  const deleteTransaction = useCallback(async (txId, monthKey) => {
    const key = monthKey || currentMonth
    const transactions = (allMonths[key]?.transactions || []).filter(t => t.id !== txId)
    await updateDoc(doc(db, 'months', key), { transactions })
    setAllMonths(prev => ({ ...prev, [key]: { ...prev[key], transactions } }))
  }, [currentMonth, allMonths])

  const updateTransaction = useCallback(async (txId, updates, monthKey) => {
    const key = monthKey || currentMonth
    const transactions = (allMonths[key]?.transactions || []).map(t =>
      t.id === txId ? { ...t, ...updates } : t
    )
    await updateDoc(doc(db, 'months', key), { transactions })
    setAllMonths(prev => ({ ...prev, [key]: { ...prev[key], transactions } }))
  }, [currentMonth, allMonths])

  // ── ENTRADAS ──
  const saveIncome = useCallback(async (incomeId, received, amount) => {
    const incomes = [...(monthData.incomes || [])]
    const idx = incomes.findIndex(i => i.id === incomeId)
    const entry = { id: incomeId, received, amount, recordedAt: new Date().toISOString() }
    if (idx >= 0) incomes[idx] = entry
    else incomes.push(entry)
    await updateDoc(doc(db, 'months', currentMonth), { incomes })
  }, [monthData, currentMonth])

  // ── ASSINATURAS ──
  const saveSubscription = useCallback(async (sub) => {
    const list = [...(config.subscriptions || [])]
    const idx = list.findIndex(s => s.id === sub.id)
    if (idx >= 0) list[idx] = sub
    else list.push(sub)
    await saveConfig({ subscriptions: list })
  }, [config, saveConfig])

  const deleteSubscription = useCallback(async (subId) => {
    await saveConfig({ subscriptions: (config.subscriptions || []).filter(s => s.id !== subId) })
  }, [config, saveConfig])

  const saveSubCategories = useCallback(async (cats) => {
    await saveConfig({ subscriptionCategories: cats })
  }, [saveConfig])

  // ── BENEFÍCIOS ──
  const saveBenefitDeposit = useCallback(async (cardId, person, amount) => {
    const deposits = [...(monthData.benefitDeposits || [])]
    const idx = deposits.findIndex(d => d.cardId === cardId && d.person === person)
    const entry = { cardId, person, amount }
    if (idx >= 0) deposits[idx] = entry
    else deposits.push(entry)
    await updateDoc(doc(db, 'months', currentMonth), { benefitDeposits: deposits })
  }, [monthData, currentMonth])

  const saveBenefitExpense = useCallback(async (expense) => {
    const list = [...(monthData.benefitExpenses || [])]
    const idx = list.findIndex(e => e.id === expense.id)
    if (idx >= 0) list[idx] = expense
    else list.push(expense)
    await updateDoc(doc(db, 'months', currentMonth), { benefitExpenses: list })
  }, [monthData, currentMonth])

  const deleteBenefitExpense = useCallback(async (expId) => {
    const list = (monthData.benefitExpenses || []).filter(e => e.id !== expId)
    await updateDoc(doc(db, 'months', currentMonth), { benefitExpenses: list })
  }, [monthData, currentMonth])

  const saveBenefitCards = useCallback(async (cards) => {
    await saveConfig({ benefitCards: cards })
  }, [saveConfig])

  const saveBenefitCategories = useCallback(async (cats) => {
    await saveConfig({ benefitCategories: cats })
  }, [saveConfig])

  // ── COMPUTED ──
  const computedData = useCallback((monthKey) => {
    const key = monthKey || currentMonth
    // Para o mês atual: sempre usa monthData (realtime via onSnapshot)
    // Para meses anteriores: usa allMonths (snapshot estático)
    const mData = key === currentMonth ? monthData : (allMonths[key] || {})

    const txs           = mData.transactions  || []
    const bills         = mData.fixedBills    || []
    const incomes       = mData.incomes       || []
    const extraPayments = mData.extraPayments || []
    const cardPmts      = mData.cardPayments  || []

    // Mapa cardId → pessoa responsável (override mensal ou padrão do config)
    const cardPersonMap = {}
    config.cards.forEach(card => {
      const override = cardPmts.find(p => p.cardId === card.id)
      cardPersonMap[card.id] = override?.person || card.person || 'tereza'
    })

    const totalIncome = { tereza: 0, sebastiao: 0 }
    config.incomes.forEach(inc => {
      const recorded = incomes.find(i => i.id === inc.id)
      const val = recorded ? recorded.amount : inc.amount
      if (inc.person === 'tereza')      totalIncome.tereza    += val
      else if (inc.person === 'sebastiao') totalIncome.sebastiao += val
    })

    const byCategory = {}
    const byPerson   = { tereza: 0, sebastiao: 0 }

    // Transações de cartão — atribuídas à pessoa responsável pelo cartão neste mês
    txs.forEach(tx => {
      const person = cardPersonMap[tx.cardId] || tx.person
      if (!byCategory[tx.category]) byCategory[tx.category] = { tereza: 0, sebastiao: 0, total: 0 }
      byCategory[tx.category].total += tx.amount
      if (person === 'tereza' || person === 'sebastiao') {
        byCategory[tx.category][person] = (byCategory[tx.category][person] || 0) + tx.amount
        byPerson[person] += tx.amount
      }
    })

    // Pagamentos avulsos
    extraPayments.forEach(ep => {
      const amt = ep.amount || 0
      if (!byCategory[ep.category]) byCategory[ep.category] = { tereza: 0, sebastiao: 0, total: 0 }
      byCategory[ep.category].total += amt
      if (ep.person === 'both') {
        byCategory[ep.category].tereza    = (byCategory[ep.category].tereza    || 0) + amt / 2
        byCategory[ep.category].sebastiao = (byCategory[ep.category].sebastiao || 0) + amt / 2
        byPerson.tereza    += amt / 2
        byPerson.sebastiao += amt / 2
      } else if (ep.person === 'tereza' || ep.person === 'sebastiao') {
        byCategory[ep.category][ep.person] = (byCategory[ep.category][ep.person] || 0) + amt
        byPerson[ep.person] += amt
      }
    })

    const fixedPaid = { tereza: 0, sebastiao: 0 }
    bills.filter(b => b.paid).forEach(b => {
      const cfg = config.fixedBills.find(f => f.id === b.id)
      if (!cfg) return
      const amt = b.amount || cfg.amount
      if (cfg.person === 'both')           { fixedPaid.tereza += amt / 2; fixedPaid.sebastiao += amt / 2 }
      else if (cfg.person === 'tereza')    fixedPaid.tereza    += amt
      else if (cfg.person === 'sebastiao') fixedPaid.sebastiao += amt
    })

    const installmentDebt = txs
      .filter(tx => tx.installmentTotal > 1)
      .reduce((acc, tx) => acc + (tx.installmentTotal - tx.installmentNumber) * tx.installmentAmount, 0)

    // Agrega gastos por categoria principal
    const byMainCategory = {}
    GENERAL_CATEGORIES.forEach(cat => {
      byMainCategory[cat.id] = { tereza: 0, sebastiao: 0, total: 0 }
    })
    // Transações de cartão
    txs.forEach(tx => {
      const person = cardPersonMap[tx.cardId] || tx.person
      const mainCat = SUBCATEGORY_TO_MAIN[tx.category] || 'custos_fixos_essenciais'
      if (byMainCategory[mainCat]) {
        byMainCategory[mainCat].total += tx.amount
        if (person === 'tereza' || person === 'sebastiao') {
          byMainCategory[mainCat][person] = (byMainCategory[mainCat][person] || 0) + tx.amount
        }
      }
    })
    // Pagamentos avulsos
    extraPayments.forEach(ep => {
      const mainCat = SUBCATEGORY_TO_MAIN[ep.category] || ep.category
      if (!byMainCategory[mainCat]) return
      const amt = ep.amount || 0
      byMainCategory[mainCat].total += amt
      if (ep.person === 'both') {
        byMainCategory[mainCat].tereza    = (byMainCategory[mainCat].tereza    || 0) + amt / 2
        byMainCategory[mainCat].sebastiao = (byMainCategory[mainCat].sebastiao || 0) + amt / 2
      } else if (ep.person === 'tereza' || ep.person === 'sebastiao') {
        byMainCategory[mainCat][ep.person] = (byMainCategory[mainCat][ep.person] || 0) + amt
      }
    })
    // Contas fixas pagas
    bills.filter(b => b.paid).forEach(b => {
      const cfg = config.fixedBills.find(f => f.id === b.id)
      if (!cfg) return
      const amt = b.amount || cfg.amount || 0
      const mainCat = SUBCATEGORY_TO_MAIN[cfg.category] || cfg.category
      if (!byMainCategory[mainCat]) return
      byMainCategory[mainCat].total += amt
      if (cfg.person === 'both') {
        byMainCategory[mainCat].tereza    = (byMainCategory[mainCat].tereza    || 0) + amt / 2
        byMainCategory[mainCat].sebastiao = (byMainCategory[mainCat].sebastiao || 0) + amt / 2
      } else if (cfg.person === 'tereza' || cfg.person === 'sebastiao') {
        byMainCategory[mainCat][cfg.person] = (byMainCategory[mainCat][cfg.person] || 0) + amt
      }
    })

    return { totalIncome, byCategory, byMainCategory, byPerson, fixedPaid, installmentDebt, txs, bills, incomes, extraPayments }
  }, [config, allMonths, monthData, currentMonth])

  const value = {
    config, saveConfig,
    currentMonth, setCurrentMonth,
    monthData, allMonths,
    loading,
    toggleFixedBill,
    toggleCardPayment, setCardPaymentPerson,
    saveExtraPayment, deleteExtraPayment,
    saveTransactions, deleteTransaction, updateTransaction,
    saveIncome,
    saveSubscription, deleteSubscription, saveSubCategories,
    saveBenefitDeposit, saveBenefitExpense, deleteBenefitExpense,
    saveBenefitCards, saveBenefitCategories,
    computedData,
    GENERAL_CATEGORIES, CARD_CATEGORIES, SUBCATEGORY_TO_MAIN, PESSOAS,
  }

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export const useFinance = () => {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider')
  return ctx
}
