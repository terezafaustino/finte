import { HashRouter, Routes, Route } from 'react-router-dom'
import { FinanceProvider } from './contexts/FinanceContext'
import Sidebar       from './components/Sidebar'
import Header        from './components/Header'
import Dashboard     from './pages/Dashboard'
import Cartoes       from './pages/Cartoes'
import ContasFixas   from './pages/ContasFixas'
import Entradas      from './pages/Entradas'
import Assinaturas   from './pages/Assinaturas'
import Metas         from './pages/Metas'
import Relatorios    from './pages/Relatorios'
import Configuracoes from './pages/Configuracoes'
import CartoesResumo from './pages/CartoesResumo'

function Layout({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <Header />
        {children}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <FinanceProvider>
        <Layout>
          <Routes>
            <Route path="/"               element={<Dashboard />} />
            <Route path="/cartoes"        element={<Cartoes />} />
            <Route path="/fixas"          element={<ContasFixas />} />
            <Route path="/entradas"       element={<Entradas />} />
            <Route path="/assinaturas"    element={<Assinaturas />} />
            <Route path="/metas"          element={<Metas />} />
            <Route path="/relatorios"     element={<Relatorios />} />
            <Route path="/config"         element={<Configuracoes />} />
            <Route path="/cartoes-resumo" element={<CartoesResumo />} />
          </Routes>
        </Layout>
      </FinanceProvider>
    </HashRouter>
  )
}
