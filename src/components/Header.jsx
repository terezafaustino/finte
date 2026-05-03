import { useLocation } from 'react-router-dom'
import { formatBRL, monthLabel } from '../utils/calculations'
import { useFinance } from '../contexts/FinanceContext'

const TITLES = {
  '/':           { title: 'Dashboard',               subtitle: 'Visão geral financeira' },
  '/cartoes':    { title: 'Cartões de Crédito',       subtitle: 'Faturas e transações' },
  '/fixas':      { title: 'Contas Fixas',             subtitle: 'Contas mensais recorrentes' },
  '/entradas':   { title: 'Entradas',                 subtitle: 'Salários e receitas' },
  '/metas':      { title: 'Metas & Investimentos',    subtitle: 'Controle de metas por categoria' },
  '/relatorios': { title: 'Projeções do Ano',         subtitle: 'Estimativas e planejamento' },
  '/config':     { title: 'Configurações',            subtitle: 'Cartões, salários e categorias' },
}

export default function Header() {
  const { pathname } = useLocation()
  const { currentMonth, computedData } = useFinance()
  const info = TITLES[pathname] || { title: 'FinTê', subtitle: '' }
  const data = computedData()

  return (
    <header className="header">
      <div>
        <div className="header-title">{info.title}</div>
        <div className="header-subtitle">{monthLabel(currentMonth)} · {info.subtitle}</div>
      </div>
      <div className="header-right">
        <div className="person-badge active-tereza">
          <div className="avatar" style={{ background: 'var(--pink)' }}>T</div>
          <span>Tereza</span>
          <span style={{ opacity: 0.7 }}>{formatBRL(data.totalIncome.tereza)}</span>
        </div>
        <div className="person-badge active-sebastiao">
          <div className="avatar" style={{ background: 'var(--purple)' }}>S</div>
          <span>Sebastião</span>
          <span style={{ opacity: 0.7 }}>{formatBRL(data.totalIncome.sebastiao)}</span>
        </div>
      </div>
    </header>
  )
}
