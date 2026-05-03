import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc,
  deleteDoc, onSnapshot, writeBatch, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase/config'

const FinanceContext = createContext(null)

// ─── Mês corrente ────────────────────────────────────────────
const toMonthKey = (date) => {
  const d = date instanceof Date ? date : new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ─── Categorias gerais ────────────────────────────────────────
export const GENERAL_CATEGORIES = [
  { id: 'custos_fixos',     label: 'Custos Fixos',           color: '#EF4444', icon: '🏠' },
  { id: 'assinaturas',      label: 'Assinaturas',            color: '#8B5CF6', icon: '📱' },
  { id: 'manutencao',       label: 'Manutenção & Mobilidade', color: '#F59E0B', icon: '🚗' },
  { id: 'investimentos',    label: 'Investimentos Geral',    color: '#10B981', icon: '📈' },
  { id: 'inv_viagem',       label: 'Investimentos Viagem',   color: '#06B6D4', icon: '✈️' },
  { id: 'beleza_lazer',     label: 'Beleza & Lazer',         color: '#EC4899', icon: '💄' },
  { id: 'educacao',         label: 'Educação',               color: '#3B82F6', icon: '📚' },
  { id: 'saude',            label: 'Saúde',                  color: '#14B8A6', icon: '🏥' },
  { id: 'saque',            label: 'Saque Dinheiro',         color: '#6B7280', icon: '💵' },
  { id: 'imposto_renda',    label: 'Imposto de Renda',       color: '#DC2626', icon: '🧾' },
]

// ─── Categorias de cartão ────────────────────────────────────
export const CARD_CATEGORIES = [
  { id: 'supermercado',     label: 'Supermercado',           color: '#10B981', icon: '🛒' },
  { id: 'restaurantes',     label: 'Lanches/Restaurantes',   color: '#F59E0B', icon: '🍔' },
  { id: 'ecommerce',        label: 'E-commerce',             color: '#3B82F6', icon: '📦' },
  { id: 'vestuario',        label: 'Vestuário',              color: '#EC4899', icon: '👗' },
  { id: 'casa_utensílios',  label: 'Casa & Utensílios',      color: '#8B5CF6', icon: '🏠' },
  { id: 'assinaturas_card', label: 'Assinaturas',            color: '#6366F1', icon: '📱' },
  { id: 'transporte_app',   label: 'Transporte por app',     color: '#0EA5E9', icon: '🚕' },
  { id: 'carro',            label: 'Carro',                  color: '#F97316', icon: '🚗' },
  { id: 'farmacia',         label: 'Farmácia',               color: '#14B8A6', icon: '💊' },
  { id: 'beleza_estetica',  label: 'Beleza & Estética',      color: '#D946EF', icon: '💅' },
  { id: 'presentes',        label: 'Presentes e Doações',    color: '#EF4444', icon: '🎁' },
  { id: 'pets',             label: 'Pets',                   color: '#84CC16', icon: '🐾' },
  { id: 'diversos',         label: 'Imprevistos/Diversos',   color: '#94A3B8', icon: '❓' },
]

// ─── Pessoas ─────────────────────────────────────────────────
export const PESSOAS = [
  { id: 'tereza',    label: 'Tereza',    color: '#EC4899', avatar: 'T' },
  { id: 'sebastiao', label: 'Sebastião', color: '#8B5CF6', avatar: 'S' },
]

// ─── Default config ───────────────────────────────────────────
const DEFAULT_CONFIG = {
  cards: [
    { id: 'inter',     bank: 'Inter',     brand: 'Mastercard', dueDay: 10, color: '#FF6600', person: 'tereza' },
    { id: 'bradesco',  bank: 'Bradesco',  brand: 'Visa',       dueDay: 15, color: '#CC0000', person: 'tereza' },
    { id: 'santander', bank: 'Santander', brand: 'Mastercard', dueDay: 20, color: '#CC0000', person: 'sebastiao' },
    { id: 'sofisa',    bank: 'Sofisa',    brand: 'Mastercard', dueDay: 5,  color: '#00A859', person: 'tereza' },
  ],
  incomes: [
    { id: 'tereza_clt',         label: 'Tereza CLT',           person: 'tereza',    type: 'salary',     amount: 0, hasThirteenth: true },
    { id: 'sebastiao_clt',      label: 'Sebastião CLT',        person: 'sebastiao', type: 'salary',     amount: 0, hasThirteenth: true },
    { id: 'sebastiao_pensao',   label: 'Sebastião Pensão',     person: 'sebastiao', type: 'other',      amount: 0, hasThirteenth: false },
    { id: 'sebastiao_aposent',  label: 'Sebastião Aposentadoria', person: 'sebastiao', type: 'other',   amount: 0, hasThirteenth: true },
  ],
  fixedBills: [
    { id: 'aluguel',     label: 'Aluguel/Condomínio', category: 'custos_fixos', amount: 0, person: 'both', active: true },
    { id: 'luz',         label: 'Luz',                category: 'custos_fixos', amount: 0, person: 'both', active: true },
    { id: 'agua',        label: 'Água',               category: 'custos_fixos', amount: 0, person: 'both', active: true },
    { id: 'internet',    label: 'Internet',           category: 'assinaturas',  amount: 0, person: 'both', active: true },
    { id: 'cel_tereza',  label: 'Celular Tereza',     category: 'assinaturas',  amount: 0, person: 'tereza', active: true },
    { id: 'cel_sebas',   label: 'Celular Sebastião',  category: 'assinaturas',  amount: 0, person: 'sebastiao', active: true },
    { id: 'netflix',     label: 'Netflix',            category: 'assinaturas',  amount: 0, person: 'tereza', active: true },
    { id: 'spotify',     label: 'Spotify',            category: 'assinaturas',  amount: 0, person: 'tereza', active: true },
    { id: 'seguro_auto', label: 'Seguro do Carro',    category: 'manutencao',   amount: 0, person: 'both', active: true },
    { id: 'plano_saude', label: 'Plano de Saúde',     category: 'saude',        amount: 0, person: 'both', active: true },
  ],
  goals: {
    tereza:    { custos_fixos: 25, assinaturas: 10, manutencao: 10, investimentos: 20, inv_viagem: 5, beleza_lazer: 10, educacao: 5, saude: 5, saque: 5, imposto_renda: 5 },
    sebastiao: { custos_fixos: 30, assinaturas: 10, manutencao: 10, investimentos: 15, inv_viagem: 5, beleza_lazer: 10, educacao: 5, saude: 10, saque: 5, imposto_renda: 0 },
  },
}

// ─── Provider ────────────────────────────────────────────────
export function FinanceProvider({ children }) {
  const [config, setConfig]           = useState(DEFAULT_CONFIG)
  const [currentMonth, setCurrentMonth] = useState(toMonthKey(new Date()))
  const [monthData, setMonthData]     = useState({})    // { fixedBills: [], transactions: [], incomes: [] }
  const [allMonths, setAllMonths]     = useState({})    // cache de todos os meses
  const [loading, setLoading]         = useState(true)
  const [configReady, setConfigReady] = useState(false)

  // ── Carregar config ──
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'main'), (snap) => {
      if (snap.exists()) {
        setConfig(prev => ({ ...DEFAULT_CONFIG, ...snap.data() }))
      } else {
        // Primeira vez: salvar config padrão
        setDoc(doc(db, 'config', 'main'), DEFAULT_CONFIG)
      }
      setConfigReady(true)
    })
    return unsub
  }, [])

  // ── Carregar dados do mês corrente ──
  useEffect(() => {
    if (!configReady) return
    const unsub = onSnapshot(doc(db, 'months', currentMonth), (snap) => {
      if (snap.exists()) {
        setMonthData(snap.data())
      } else {
        const initial = { fixedBills: [], transactions: [], incomes: [], createdAt: new Date().toISOString() }
        setDoc(doc(db, 'months', currentMonth), initial)
        setMonthData(initial)
      }
      setLoading(false)
    })
    return unsub
  }, [currentMonth, configReady])

  // ── Carregar todos os meses (para projeções) ──
  useEffect(() => {
    if (!configReady) return
    getDocs(collection(db, 'months')).then(snap => {
      const data = {}
      snap.forEach(d => { data[d.id] = d.data() })
      setAllMonths(data)
    })
  }, [configReady, currentMonth])

  // ──────────────────────────────────────────────────────────
  // CONFIG helpers
  // ──────────────────────────────────────────────────────────
  const saveConfig = useCallback(async (updates) => {
    const newCfg = { ...config, ...updates }
    await setDoc(doc(db, 'config', 'main'), newCfg)
    setConfig(newCfg)
  }, [config])

  // ──────────────────────────────────────────────────────────
  // CONTAS FIXAS — marcar como paga / alterar valor no mês
  // ──────────────────────────────────────────────────────────
  const toggleFixedBill = useCallback(async (billId, paid, paidAmount) => {
    const bills = [...(monthData.fixedBills || [])]
    const idx = bills.findIndex(b => b.id === billId)
    const entry = { id: billId, paid, amount: paidAmount, paidAt: paid ? new Date().toISOString() : null }
    if (idx >= 0) bills[idx] = entry
    else bills.push(entry)
    await updateDoc(doc(db, 'months', currentMonth), { fixedBills: bills })
  }, [monthData, currentMonth])

  // ──────────────────────────────────────────────────────────
  // TRANSAÇÕES (cartão / manual)
  // ──────────────────────────────────────────────────────────
  const saveTransactions = useCallback(async (transactions, monthKey) => {
    const key = monthKey || currentMonth
    const existing = allMonths[key]?.transactions || []
    // Mescla: evita duplicatas por id
    const map = {}
    existing.forEach(t => { map[t.id] = t })
    transactions.forEach(t => { map[t.id] = t })
    const merged = Object.values(map)
    await updateDoc(doc(db, 'months', key), { transactions: merged }).catch(() =>
      setDoc(doc(db, 'months', key), { transactions: merged, fixedBills: [], incomes: [] })
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

  // ──────────────────────────────────────────────────────────
  // ENTRADAS mensais (salários recebidos)
  // ──────────────────────────────────────────────────────────
  const saveIncome = useCallback(async (incomeId, received, amount) => {
    const incomes = [...(monthData.incomes || [])]
    const idx = incomes.findIndex(i => i.id === incomeId)
    const entry = { id: incomeId, received, amount, recordedAt: new Date().toISOString() }
    if (idx >= 0) incomes[idx] = entry
    else incomes.push(entry)
    await updateDoc(doc(db, 'months', currentMonth), { incomes })
  }, [monthData, currentMonth])

  // ──────────────────────────────────────────────────────────
  // COMPUTED values para o mês corrente
  // ──────────────────────────────────────────────────────────
  const computedData = useCallback((monthKey) => {
    const key = monthKey || currentMonth
    const mData = allMonths[key] || monthData
    const txs = mData.transactions || []
    const bills = mData.fixedBills || []
    const incomes = mData.incomes || []

    // Total recebido
    const totalIncome = { tereza: 0, sebastiao: 0 }
    config.incomes.forEach(inc => {
      const recorded = incomes.find(i => i.id === inc.id)
      const val = recorded ? recorded.amount : inc.amount
      if (inc.person === 'tereza') totalIncome.tereza += val
      else if (inc.person === 'sebastiao') totalIncome.sebastiao += val
    })

    // Gastos por categoria e pessoa (transações cartão)
    const byCategory = {}
    const byPerson = { tereza: 0, sebastiao: 0 }
    txs.forEach(tx => {
      if (!byCategory[tx.category]) byCategory[tx.category] = { tereza: 0, sebastiao: 0, total: 0 }
      byCategory[tx.category][tx.person] = (byCategory[tx.category][tx.person] || 0) + tx.amount
      byCategory[tx.category].total += tx.amount
      if (tx.person === 'tereza' || tx.person === 'sebastiao') byPerson[tx.person] += tx.amount
    })

    // Gastos contas fixas pagas
    const fixedPaid = { tereza: 0, sebastiao: 0 }
    bills.filter(b => b.paid).forEach(b => {
      const cfg = config.fixedBills.find(f => f.id === b.id)
      if (!cfg) return
      const amt = b.amount || cfg.amount
      if (cfg.person === 'both') { fixedPaid.tereza += amt / 2; fixedPaid.sebastiao += amt / 2 }
      else if (cfg.person === 'tereza') fixedPaid.tereza += amt
      else if (cfg.person === 'sebastiao') fixedPaid.sebastiao += amt
    })

    // Parcelamentos — dívida total
    const installmentDebt = txs
      .filter(tx => tx.installmentTotal > 1)
      .reduce((acc, tx) => {
        const remaining = (tx.installmentTotal - tx.installmentNumber) * tx.installmentAmount
        return acc + remaining
      }, 0)

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
