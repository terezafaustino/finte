// ─── Utilitários de cálculo financeiro ───────────────────────

export const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
export const MONTHS_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export const toMonthKey = (date) => {
  const d = date instanceof Date ? date : new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export const monthLabel = (key) => {
  const [y, m] = key.split('-')
  return `${MONTHS_PT[parseInt(m) - 1]}/${y}`
}

export const formatBRL = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)

export const formatPct = (value) => `${(value || 0).toFixed(1)}%`

// Retorna os últimos N meses (inclusive o atual)
export const lastNMonths = (n = 6) => {
  const result = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push(toMonthKey(d))
  }
  return result
}

// Retorna todos os meses do ano corrente
export const yearMonths = (year) => {
  const y = year || new Date().getFullYear()
  return Array.from({ length: 12 }, (_, i) =>
    `${y}-${String(i + 1).padStart(2, '0')}`
  )
}

// Calcula totais de gastos de um mês dado o config
export const calcMonthTotals = (monthData, config) => {
  if (!monthData || !config) return { total: 0, tereza: 0, sebastiao: 0 }

  const txs           = monthData.transactions  || []
  const bills         = monthData.fixedBills    || []
  const extraPayments = monthData.extraPayments || []

  let tereza = 0, sebastiao = 0

  // Transações cartão
  txs.forEach(tx => {
    if (tx.person === 'tereza')    tereza    += tx.amount
    if (tx.person === 'sebastiao') sebastiao += tx.amount
  })

  // Contas fixas pagas
  bills.filter(b => b.paid).forEach(b => {
    const cfg = (config.fixedBills || []).find(f => f.id === b.id)
    if (!cfg) return
    const amt = b.amount || cfg.amount || 0
    if (cfg.person === 'both')           { tereza += amt / 2; sebastiao += amt / 2 }
    else if (cfg.person === 'tereza')    tereza    += amt
    else if (cfg.person === 'sebastiao') sebastiao += amt
  })

  // Pagamentos avulsos
  extraPayments.forEach(ep => {
    const amt = ep.amount || 0
    if (ep.person === 'both')           { tereza += amt / 2; sebastiao += amt / 2 }
    else if (ep.person === 'tereza')    tereza    += amt
    else if (ep.person === 'sebastiao') sebastiao += amt
  })

  return { total: tereza + sebastiao, tereza, sebastiao }
}

// Projeção mensal baseada na média dos últimos meses
export const projectMonths = (allMonths, config, targetYear) => {
  const y = targetYear || new Date().getFullYear()
  const months = yearMonths(y)
  const pastMonths = months.filter(m => allMonths[m])

  const avgTereza    = pastMonths.length
    ? pastMonths.reduce((a, m) => a + calcMonthTotals(allMonths[m], config).tereza, 0)    / pastMonths.length
    : 0
  const avgSebastiao = pastMonths.length
    ? pastMonths.reduce((a, m) => a + calcMonthTotals(allMonths[m], config).sebastiao, 0) / pastMonths.length
    : 0

  return months.map(key => {
    const [, mo] = key.split('-')
    const actual = allMonths[key] ? calcMonthTotals(allMonths[key], config) : null
    const isThirteenth = parseInt(mo) === 12
    const thirteenthBonus = isThirteenth
      ? (config.incomes || []).filter(i => i.hasThirteenth).reduce((a, i) => {
          if (i.person === 'tereza') return { ...a, tereza: a.tereza + i.amount }
          if (i.person === 'sebastiao') return { ...a, sebastiao: a.sebastiao + i.amount }
          return a
        }, { tereza: 0, sebastiao: 0 })
      : { tereza: 0, sebastiao: 0 }

    return {
      key,
      label: monthLabel(key),
      tereza:    actual ? actual.tereza    : avgTereza,
      sebastiao: actual ? actual.sebastiao : avgSebastiao,
      isProjected: !actual,
      thirteenthBonus,
    }
  })
}

// Retorna insights baseados nos dados do mês
export const generateInsights = (computedData, config) => {
  const insights = []
  const { byCategory, byPerson, totalIncome } = computedData

  // Maior categoria de gasto
  const cats = Object.entries(byCategory).sort((a, b) => b[1].total - a[1].total)
  if (cats.length > 0) {
    const [topCat, topData] = cats[0]
    insights.push({
      type: 'warning',
      icon: '📊',
      title: `Maior gasto: ${topCat}`,
      message: `Você gastou ${formatBRL(topData.total)} em ${topCat} este mês. Considere revisar se está dentro da meta.`,
    })
  }

  // Verifica metas
  Object.entries(config.goals || {}).forEach(([person, goals]) => {
    const income = totalIncome[person] || 0
    if (income === 0) return
    Object.entries(goals).forEach(([cat, pct]) => {
      const spent = (byCategory[cat]?.[person] || 0)
      const limit = income * (pct / 100)
      if (spent > limit * 1.1) {
        insights.push({
          type: 'alert',
          icon: '⚠️',
          title: `Meta ultrapassada — ${person === 'tereza' ? 'Tereza' : 'Sebastião'}`,
          message: `Categoria ${cat}: gasto ${formatBRL(spent)} vs meta ${formatBRL(limit)} (${pct}% da renda).`,
        })
      }
    })
  })

  // Dica geral
  if (insights.length === 0) {
    insights.push({
      type: 'success',
      icon: '✅',
      title: 'Ótimo controle!',
      message: 'Você está dentro de todas as metas este mês. Continue assim!',
    })
  }

  return insights
}
