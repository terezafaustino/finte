import { useState, useCallback, useRef } from 'react'
import { useFinance } from '../contexts/FinanceContext'
import { parseCreditCardPDF } from '../utils/pdfParser'
import { formatBRL, monthLabel } from '../utils/calculations'

const PERSON_OPTIONS = [
  { value: 'tereza',    label: 'Tereza',    color: 'var(--pink)' },
  { value: 'sebastiao', label: 'Sebastião', color: 'var(--purple)' },
]

export default function Cartoes() {
  const { config, currentMonth, allMonths, monthData, saveTransactions, updateTransaction, deleteTransaction, CARD_CATEGORIES } = useFinance()

  const [activeCard, setActiveCard]       = useState(config.cards[0]?.id || '')
  const [uploading, setUploading]         = useState(false)
  const [uploadError, setUploadError]     = useState('')
  const [uploadResult, setUploadResult]   = useState(null)
  const [pendingTxs, setPendingTxs]       = useState([])   // transações parsed aguardando confirmação
  const [editTx, setEditTx]               = useState(null)
  const [dragover, setDragover]           = useState(false)
  const fileRef = useRef(null)

  const transactions = (monthData.transactions || []).filter(tx => tx.cardId === activeCard)
  const allTxs       = monthData.transactions || []

  // Dívida total parcelamentos
  const installmentDebt = allTxs
    .filter(tx => tx.installmentTotal > 1)
    .reduce((acc, tx) => {
      const remaining = Math.max(0, tx.installmentTotal - tx.installmentNumber) * (tx.installmentAmount || tx.amount)
      return acc + remaining
    }, 0)

  // ── Totais por pessoa ──
  const totalTereza    = allTxs.filter(t => t.person === 'tereza').reduce((a, t) => a + t.amount, 0)
  const totalSebastiao = allTxs.filter(t => t.person === 'sebastiao').reduce((a, t) => a + t.amount, 0)
  const pending        = allTxs.filter(t => !t.person || !t.category).length

  // ── Upload handler ──
  const handleFiles = useCallback(async (files) => {
    setUploadError('')
    setUploadResult(null)

    for (const file of files) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setUploadError('Por favor, envie apenas arquivos PDF.')
        return
      }
    }

    setUploading(true)
    try {
      const allParsed = []
      for (const file of files) {
        const cardCfg = config.cards.find(c => c.id === activeCard)
        const forcedBank = cardCfg?.bank?.toLowerCase()
        const result = await parseCreditCardPDF(file, forcedBank)
        allParsed.push(...result.transactions.map(tx => ({ ...tx, cardId: activeCard })))
        setUploadResult({ bank: result.bank, count: result.transactions.length })
      }
      // Marca itens sem categoria como pendentes para revisão
      setPendingTxs(allParsed.map(tx => ({
        ...tx,
        person: config.cards.find(c => c.id === activeCard)?.person || null,
      })))
    } catch (err) {
      console.error(err)
      setUploadError(`Erro ao ler PDF: ${err.message}. Verifique se o arquivo não está protegido por senha.`)
    } finally {
      setUploading(false)
    }
  }, [activeCard, config.cards])

  const onFileInput = (e) => {
    if (e.target.files?.length) handleFiles(Array.from(e.target.files))
  }

  const onDrop = (e) => {
    e.preventDefault(); setDragover(false)
    handleFiles(Array.from(e.dataTransfer.files))
  }

  // ── Confirmar importação ──
  const confirmImport = async () => {
    await saveTransactions(pendingTxs, currentMonth)
    setPendingTxs([])
    setUploadResult(null)
  }

  // ── Editar transação ──
  const saveTxEdit = async () => {
    if (!editTx) return
    await updateTransaction(editTx.id, {
      category: editTx.category,
      person:   editTx.person,
      description: editTx.description,
      amount:   parseFloat(String(editTx.amount).replace(',', '.')) || editTx.amount,
    }, currentMonth)
    setEditTx(null)
  }

  const catLabel = (id) => CARD_CATEGORIES.find(c => c.id === id)?.label || id || '—'
  const catColor = (id) => CARD_CATEGORIES.find(c => c.id === id)?.color || '#94A3B8'
  const cardCfg  = config.cards.find(c => c.id === activeCard)

  return (
    <div className="page-body">

      {/* ── KPI bar ── */}
      <div className="grid-4 mb-24">
        <div className="metric-card" style={{ background:'var(--grad-primary)' }}>
          <div className="metric-card-icon">💳</div>
          <div className="metric-card-label">Total Cartões</div>
          <div className="metric-card-value">{formatBRL(totalTereza + totalSebastiao)}</div>
          <div className="metric-card-sub">{allTxs.length} transações</div>
        </div>
        <div className="metric-card" style={{ background:'var(--grad-red)' }}>
          <div className="metric-card-icon">T</div>
          <div className="metric-card-label">Tereza</div>
          <div className="metric-card-value">{formatBRL(totalTereza)}</div>
          <div className="metric-card-sub">{allTxs.filter(t=>t.person==='tereza').length} transações</div>
        </div>
        <div className="metric-card" style={{ background:'var(--grad-blue)' }}>
          <div className="metric-card-icon">S</div>
          <div className="metric-card-label">Sebastião</div>
          <div className="metric-card-value">{formatBRL(totalSebastiao)}</div>
          <div className="metric-card-sub">{allTxs.filter(t=>t.person==='sebastiao').length} transações</div>
        </div>
        <div className="metric-card" style={{ background: installmentDebt > 0 ? 'var(--grad-orange)' : 'var(--grad-green)' }}>
          <div className="metric-card-icon">📅</div>
          <div className="metric-card-label">Dívida Parcelamentos</div>
          <div className="metric-card-value">{formatBRL(installmentDebt)}</div>
          <div className="metric-card-sub">Parcelas futuras</div>
        </div>
      </div>

      {/* ── Tabs cartões ── */}
      <div className="card mb-24">
        <div className="flex items-center justify-between mb-16">
          <div className="flex gap-8" style={{ flexWrap:'wrap' }}>
            {config.cards.map(card => (
              <button
                key={card.id}
                className={`btn ${activeCard === card.id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveCard(card.id)}
              >
                <span style={{ width:8, height:8, borderRadius:'50%', background:card.color, display:'inline-block' }} />
                {card.bank}
                <span className="text-sm text-muted">Vence dia {card.dueDay}</span>
              </button>
            ))}
          </div>
          {pending > 0 && (
            <span className="badge badge-orange">⚠️ {pending} sem classificação</span>
          )}
        </div>

        {/* Upload area */}
        <div
          className={`upload-area${dragover ? ' dragover' : ''}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragover(true) }}
          onDragLeave={() => setDragover(false)}
          onDrop={onDrop}
        >
          <input ref={fileRef} type="file" accept=".pdf" multiple style={{ display:'none' }} onChange={onFileInput} />
          {uploading ? (
            <div className="loading-center">
              <div className="spinner" />
              <span>Lendo fatura PDF...</span>
            </div>
          ) : (
            <>
              <div className="upload-area-icon">📄</div>
              <div className="upload-area-text">
                Arraste a fatura PDF do <strong>{cardCfg?.bank}</strong> ou clique para selecionar
              </div>
              <div className="upload-area-hint">Suporte: Inter · Bradesco · Santander · Sofisa · Nubank e outros</div>
            </>
          )}
        </div>

        {uploadError && (
          <div className="insight-card alert mt-16">
            <div className="insight-icon">❌</div>
            <div>
              <div className="insight-title">Erro na leitura</div>
              <div className="insight-msg">{uploadError}</div>
            </div>
          </div>
        )}

        {uploadResult && pendingTxs.length > 0 && (
          <div className="mt-16">
            <div className="insight-card success mb-16">
              <div className="insight-icon">✅</div>
              <div>
                <div className="insight-title">{pendingTxs.length} transações encontradas — {uploadResult.bank}</div>
                <div className="insight-msg">Revise abaixo e clique em Confirmar Importação. Itens sem categoria ficam em aberto para classificação manual.</div>
              </div>
            </div>

            {/* Preview das transações */}
            <div className="table-wrap" style={{ maxHeight:360, overflowY:'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Categoria</th>
                    <th>Pessoa</th>
                    <th className="text-right">Valor</th>
                    <th>Parcela</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pendingTxs.map((tx, i) => (
                    <tr key={tx.id}>
                      <td style={{ fontSize:12, whiteSpace:'nowrap' }}>{tx.date}</td>
                      <td>{tx.description}</td>
                      <td>
                        <select
                          className="form-select"
                          style={{ fontSize:12, padding:'4px 8px', minWidth:160 }}
                          value={tx.category || ''}
                          onChange={e => setPendingTxs(prev => prev.map((t, j) => j===i ? { ...t, category: e.target.value } : t))}
                        >
                          <option value="">— Classificar —</option>
                          {CARD_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                      </td>
                      <td>
                        <select
                          className="form-select"
                          style={{ fontSize:12, padding:'4px 8px' }}
                          value={tx.person || ''}
                          onChange={e => setPendingTxs(prev => prev.map((t, j) => j===i ? { ...t, person: e.target.value } : t))}
                        >
                          <option value="">— Pessoa —</option>
                          <option value="tereza">Tereza</option>
                          <option value="sebastiao">Sebastião</option>
                        </select>
                      </td>
                      <td className="text-right font-semibold">{formatBRL(tx.amount)}</td>
                      <td>{tx.installmentTotal > 1 ? `${tx.installmentNumber}/${tx.installmentTotal}` : '—'}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-danger"
                          title="Remover linha"
                          onClick={() => setPendingTxs(prev => prev.filter((_, j) => j !== i))}
                        >🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-12 mt-16">
              <button className="btn btn-primary" onClick={confirmImport}>✅ Confirmar Importação</button>
              <button className="btn btn-ghost" onClick={() => { setPendingTxs([]); setUploadResult(null) }}>Cancelar</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Transações salvas ── */}
      <div className="card">
        <div className="section-title flex justify-between items-center">
          <span>💳 Transações — {cardCfg?.bank} · {monthLabel(currentMonth)}</span>
          <span style={{ fontSize:13, fontWeight:400, color:'var(--text-secondary)' }}>
            {transactions.length} registros · {formatBRL(transactions.reduce((a,t) => a+t.amount, 0))}
          </span>
        </div>

        {transactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💳</div>
            <div className="empty-state-text">Nenhuma transação importada para {cardCfg?.bank} em {monthLabel(currentMonth)}</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Pessoa</th>
                  <th className="text-right">Valor</th>
                  <th>Parcela</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id} style={{ opacity: (!tx.category || !tx.person) ? 0.65 : 1 }}>
                    <td style={{ fontSize:12, whiteSpace:'nowrap' }}>{tx.date}</td>
                    <td>
                      <div style={{ maxWidth:240, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {tx.description}
                      </div>
                    </td>
                    <td>
                      {tx.category ? (
                        <span className="badge" style={{ background: catColor(tx.category)+'18', color: catColor(tx.category) }}>
                          {catLabel(tx.category)}
                        </span>
                      ) : (
                        <span className="badge badge-orange">⚠️ Pendente</span>
                      )}
                    </td>
                    <td>
                      {tx.person === 'tereza'    && <span className="badge badge-tereza">Tereza</span>}
                      {tx.person === 'sebastiao' && <span className="badge badge-sebastiao">Sebastião</span>}
                      {!tx.person                && <span className="badge badge-orange">—</span>}
                    </td>
                    <td className="text-right font-semibold">{formatBRL(tx.amount)}</td>
                    <td style={{ fontSize:12, color:'var(--text-secondary)' }}>
                      {tx.installmentTotal > 1 ? `${tx.installmentNumber}/${tx.installmentTotal}` : '—'}
                    </td>
                    <td>
                      <div className="flex gap-8">
                        <button className="btn btn-sm btn-ghost" onClick={() => setEditTx({ ...tx })}>✏️</button>
                        <button className="btn btn-sm btn-danger" onClick={() => deleteTransaction(tx.id, currentMonth)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal Editar ── */}
      {editTx && (
        <div className="modal-overlay" onClick={() => setEditTx(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">✏️ Editar Transação</div>

            <div className="form-group">
              <label className="form-label">Descrição</label>
              <input className="form-input" value={editTx.description} onChange={e => setEditTx(p => ({ ...p, description: e.target.value }))} />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Categoria</label>
                <select className="form-select" value={editTx.category || ''} onChange={e => setEditTx(p => ({ ...p, category: e.target.value }))}>
                  <option value="">— Sem categoria —</option>
                  {CARD_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Responsável</label>
                <select className="form-select" value={editTx.person || ''} onChange={e => setEditTx(p => ({ ...p, person: e.target.value }))}>
                  <option value="">— Selecionar —</option>
                  <option value="tereza">Tereza</option>
                  <option value="sebastiao">Sebastião</option>
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Valor (R$)</label>
                <input className="form-input" type="number" step="0.01" value={editTx.amount}
                  onChange={e => setEditTx(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Data</label>
                <input className="form-input" type="date" value={editTx.date || ''}
                  onChange={e => setEditTx(p => ({ ...p, date: e.target.value }))} />
              </div>
            </div>

            {editTx.installmentTotal > 1 && (
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Parcela nº</label>
                  <input className="form-input" type="number" value={editTx.installmentNumber}
                    onChange={e => setEditTx(p => ({ ...p, installmentNumber: parseInt(e.target.value)||1 }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Total de parcelas</label>
                  <input className="form-input" type="number" value={editTx.installmentTotal}
                    onChange={e => setEditTx(p => ({ ...p, installmentTotal: parseInt(e.target.value)||1 }))} />
                </div>
              </div>
            )}

            <div className="flex gap-12">
              <button className="btn btn-primary" onClick={saveTxEdit}>Salvar</button>
              <button className="btn btn-ghost" onClick={() => setEditTx(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
