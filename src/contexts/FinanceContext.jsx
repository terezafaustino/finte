import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  collection, doc, getDocs, setDoc, updateDoc, onSnapshot,
} from 'firebase/firestore'
import { db } from '../firebase/config'

const FinanceContext = createContext(null)

const toMonthKey = (date) => {
  const d = date instanceof Date ? date : new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export const GENERAL_CATEGORIES = [
  { id: 'custos_fixos',     label: 'Custos Fixos',            color: '#EF4444', icon: '🏠' },
  { id: 'assinaturas',      label: 'Assinaturas',             color: '#8B5CF6', icon: '📱' },
  { id: 'manutencao',       label: 'Manutenção & Mobilidade', color: '#F59E0B', icon: '🚗' },
  { id: 'investimentos',    label: 'Investimentos Geral',     color: '#10B981', icon: '📈' },
  { id: 'inv_viagem',       label: 'Investimentos Viagem',    color: '#06B6D4', icon: '✈️' },
  { id: 'beleza_lazer',     label: 'Beleza & Lazer',          color: '#EC4899', icon: '💄' },
  { id: 'educacao',         label: 'Educação',                color: '#3B82F6', icon: '📚' },
  { id: 'saude',            label: 'Saúde',                   color: '#14B8A6', icon: '🏥' },
  { id: 'saque',            label: 'Saque Dinheiro',          color: '#6B7280', icon: '💵' },
  { id: 'imposto_renda',    label: 'Imposto de Renda',        color: '#DC2626', icon: '🧾' },
]

export const CARD_CATEGORIES = [
  { id: 'supermercado',     label: 'Supermercado',            color: '#10B981', icon: '🛒' },
  { id: 'restaurantes',     label: 'Lanches/Restaurantes',    color: '#F59E0B', icon: '🍔' },
  { id: 'ecommerce',        label: 'E-commerce',              color: '#3B82F6', icon: '📦' },
  { id: 'vestuario',        label: 'Vestuário',               color: '#EC4899', icon: '👗' },
  { id: 'casa_utensílios',  label: 'Casa & Utensílios',       color: '#8B5CF6', icon: '🏠' },
  { id: 'assinaturas_card', label: 'Assinaturas',             color: '#6366F1', icon: '📱' },
  { id: 'transporte_app',   label: 'Transporte por app',      color: '#0EA5E9', icon: '🚕' },
  { id: 'carro',            label: 'Carro',                   color: '#F97316', icon: '🚗' },
  { id: 'farmacia',         label: 'Farmácia',                color: '#14B8A6', icon: '💊' },
  { id: 'beleza_estetica',  label: 'Beleza & Estética',       color: '#D946EF', icon: '💅' },
  { id: 'presentes',        label: 'Presentes e Doações',     color: '#EF4444', icon: '🎁' },
  { id: 'pets',             label: 'Pets',                    color: '#84CC16', icon: '🐾' },
  { id: 'diversos',         label: 'Imprevistos/Diversos',    color: '#94A3B8', icon: '❓' },
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
    { id: 'aluguel',     label: 'Aluguel/Condomínio', category: 'custos_fixos', amount: 0, person: 'both',      active: true },
    { id: 'luz',         label: 'Luz',                category: 'custos_fixos', amount: 0, person: 'both',      active: true },
    { id: 'agua',        label: 'Água',               category: 'custos_fixos', amount: 0, person: 'both',      active: true },
    { id: 'internet',    label: 'Internet',           category: 'assinaturas',  amount: 0, person: 'both',      active: true },
    { id: 'cel_tereza',  label: 'Celular Tereza',     category: 'assinaturas',  amount: 0, person: 'tereza',    active: true },
    { id: 'cel_sebas',   label: 'Celular Sebastião',  category: 'assinaturas',  amount: 0, person: 'sebastiao', active: true },
    { id: 'netflix',     label: 'Netflix',            category: 'assinaturas',  amount: 0, person: 'tereza',    active: true },
    { id: 'spotify',     label: 'Spotify',            category: 'assinaturas',  amount: 0, person: 'tereza',    active: true },
    { id: 'seguro_auto', label: 'Seguro do Carro',    category: 'manutencao',   amount: 0, person: 'both',      active: true },
    { id: 'plano_saude', label: 'Plano de Saúde',     category: 'saude',        amount: 0, person: 'both',      active: true },
  ],
  goals: {
    tereza:    { custos_fixos: 25, assinaturas: 10, manutencao: 10, investimentos: 20, inv_viagem: 5, beleza_lazer: 10, educacao: 5, saude: 5, saque: 5, imposto_renda: 5 },
    sebastiao: { custos_fixos: 30, assinaturas: 10, manutencao: 10, investimentos: 15, inv_viagem: 5, beleza_lazer: 10, educacao: 5, saude: 10, saque: 5, imposto_renda: 0 },
  },
  subscriptions:          [],
  subscriptionCategories: DEFAULT_SUB_CATEGORIES,
  benefitCards:           DEFAULT_BENEFIT_CARDS,
  benefitCategories:      DEFAULT_BENEFIT_CATEGORIES,
}

const INITIAL_MONTH = {
  fixedBills: [], transactions: [], incomes: [],
  benefitDeposits: [], benefitExpenses: [],
  investments: [],
  createdAt: new Date().toISOString(),
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
      if (snap.exists()) setConfig(prev => ({ ...DEFAULT_CONFIG, ...snap.data() }))
      else setDoc(doc(db, 'config', 'main'), DEFAULT_CONFIG)
      setConfigReady(true)
    })
    return unsub
  }, [])

  useEffect(() => {
    if (!configReady) return
    const unsub = onSnapshot(doc(db, 'months', currentMonth), (snap) => {
      if (snap.exists()) setMonthData(snap.data())
      else { setDoc(doc(db, 'months', currentMonth), INITIAL_MONTH); setMonthData(INITIAL_MONTH) }
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
    if (idx >= 0) bills[idx] = entry; else bills.push(entry)
    await updateDoc(doc(db, 'months', currentMonth), { fixedBills: bills })
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
      setDoc(doc(db, 'months', key), { ...INITIAL_MONTH, transactions: merged })
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
    if (idx >= 0) incomes[idx] = entry; else incomes.push(entry)
    await updateDoc(doc(db, 'months', currentMonth), { incomes })
  }, [monthData, currentMonth])

  // ── ASSINATURAS ──
  const saveSubscription = useCallback(async (sub) => {
    const list = [...(config.subscriptions || [])]
    const idx = list.findIndex(s => s.id === sub.id)
    if (idx >= 0) list[idx] = sub; else list.push(sub)
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
    if (idx >= 0) deposits[idx] = entry; else deposits.push(entry)
    await updateDoc(doc(db, 'months', currentMonth), { benefitDeposits: deposits })
  }, [monthData, currentMonth])

  const saveBenefitExpense = useCallback(async (expense) => {
    const list = [...(monthData.benefitExpenses || [])]
    const idx = list.findIndex(e => e.id === expense.id)
    if (idx >= 0) list[idx] = expense; else list.push(expense)
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

  // ── INVESTIMENTOS (manual, por pessoa/mês) ──
  const saveInvestmentData = useCallback(async (person, portfolioValue, monthlyAmount) => {
    const list = [...(monthData.investments || [])]
    const idx = list.findIndex(i => i.person === person)
    const entry = { person, portfolioValue, monthlyAmount, updatedAt: new Date().toISOString() }
    if (idx >= 0) list[idx] = entry; else list.push(entry)
    await updateDoc(doc(db, 'months', currentMonth), { investments: list })
  }, [monthData, currentMonth])

  // ── COMPUTED ──
  const computedData = useCallback((monthKey) => {
    const key   = monthKey || currentMonth
    const mData = allMonths[key] || monthData
    const txs   = mData.transactions || []
    const bills = mData.fixedBills   || []
    const incomes = mData.incomes    || []

    const totalIncome = { tereza: 0, sebastiao: 0 }
    config.incomes.forEach(inc => {
      const recorded = incomes.find(i => i.id === inc.id)
      const val = recorded ? recorded.amount : inc.amount
      if (inc.person === 'tereza') totalIncome.tereza += val
      else if (inc.person === 'sebastiao') totalIncome.sebastiao += val
    })

    const byCategory = {}
    const byPerson   = { tereza: 0, sebastiao: 0 }
    txs.forEach(tx => {
      if (!byCategory[tx.category]) byCategory[tx.category] = { tereza: 0, sebastiao: 0, total: 0 }
      byCategory[tx.category][tx.person] = (byCategory[tx.category][tx.person] || 0) + tx.amount
      byCategory[tx.category].total += tx.amount
      if (tx.person === 'tereza' || tx.person === 'sebastiao') byPerson[tx.person] += tx.amount
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

    return { totalIncome, byCategory, byPerson, fixedPaid, installmentDebt, txs, bills, incomes }
  }, [config, allMonths, monthData, currentMonth])

  const value = {
    config, saveConfig,
    currentMonth, setCurrentMonth,
    monthData, allMonths,
    loading,
    toggleFixedBill,
    saveTransactions, deleteTransaction, updateTransaction,
    saveIncome,
    saveSubscription, deleteSubscription, saveSubCategories,
    saveBenefitDeposit, saveBenefitExpense, deleteBenefitExpense,
    saveBenefitCards, saveBenefitCategories,
    saveInvestmentData,
    computedData,
    GENERAL_CATEGORIES, CARD_CATEGORIES, PESSOAS,
  }

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export const useFinance = () => {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider')
  return ctx
}
