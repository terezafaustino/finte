import { NavLink, useLocation } from 'react-router-dom'
import { useFinance } from '../contexts/FinanceContext'
import { MONTHS_PT } from '../utils/calculations'

const NAV = [
  { to: '/',               icon: '📊', label: 'Dashboard' },
  { to: '/cartoes',        icon: '💳', label: 'Cartões' },
  { to: '/cartoes-resumo', icon: '📊', label: 'Resumo Cartões' },
  { to: '/fixas',          icon: '🏠', label: 'Contas' },
  { to: '/entradas',       icon: '💰', label: 'Entradas' },
  { to: '/beneficios',     icon: '🎫', label: 'Benefícios' },
  { to: '/assinaturas',    icon: '📋', label: 'Assinaturas' },
  { to: '/metas',          icon: '🎯', label: 'Metas & Investimentos' },
  { to: '/relatorios',     icon: '📈', label: 'Projeções' },
  { to: '/config',         icon: '⚙️',  label: 'Configurações' },
]

// Abas independentes de mês
const MONTH_INDEPENDENT = ['/assinaturas']

export default function Sidebar() {
  const { currentMonth, setCurrentMonth } = useFinance()
  const location = useLocation()

  const now = new Date()
  const months = []
  for (let i = -11; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    months.push({ key, label: `${MONTHS_PT[d.getMonth()]} ${d.getFullYear()}` })
  }

  const noMonth = MONTH_INDEPENDENT.includes(location.pathname)

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">F</div>
        <span className="sidebar-logo-name">FinTê</span>
      </div>

      <nav className="sidebar-nav">
        <span className="sidebar-section-label">Menu</span>
        {NAV.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
          >
            <span className="sidebar-item-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-month" style={{ opacity: noMonth ? 0.4 : 1 }}>
        <label>{noMonth ? 'Mês (não aplicável)' : 'Mês de referência'}</label>
        <select
          className="month-select"
          value={currentMonth}
          onChange={e => setCurrentMonth(e.target.value)}
          disabled={noMonth}
        >
          {months.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
        </select>
      </div>
    </aside>
  )
}
