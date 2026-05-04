// ─────────────────────────────────────────────────────────────────────────────
//  PDF PARSER — lê faturas de cartão dos bancos brasileiros
//  Suportados: Inter · Bradesco · Santander · Sofisa
// ─────────────────────────────────────────────────────────────────────────────
import * as pdfjsLib from 'pdfjs-dist/build/pdf'
import { GlobalWorkerOptions } from 'pdfjs-dist/build/pdf'

// Worker inline para evitar problemas com bundlers
GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`

// ─── Categorização por palavra-chave ────────────────────────
const CATEGORY_KEYWORDS = {
  supermercado:     ['mercado', 'carrefour', 'extra', 'pão de açúcar', 'atacadão', 'assaí', 'dia %', 'sonda', 'super', 'hipermercado', 'zona sul', 'comper', 'hirota'],
  restaurantes:     ['ifood', 'rappi', 'uber eats', 'mcdonald', 'burger king', 'subway', 'domino', 'pizza', 'restaurante', 'lanche', 'padaria', 'bakery', 'cafe', 'café', 'bar ', 'churrascaria', 'rodizio', 'sushi', 'delivery', 'deliway', 'habib', 'frango', 'grill'],
  ecommerce:        ['amazon', 'shopee', 'mercado livre', 'americanas', 'magazine luiza', 'magalu', 'submarino', 'casas bahia', 'aliexpress', 'shein', 'netshoes', 'zattini', 'steam', 'ali ', 'marketplace'],
  vestuario:        ['zara', 'c&a', 'riachuelo', 'renner', 'hering', 'gap', 'forever 21', 'farm', 'reserva', 'foxter', 'brooksfield', 'lacoste', 'adidas', 'nike', 'puma', 'arezzo', 'vivara', 'roupas', 'moda', 'calçado'],
  casa_utensílios:  ['tok stok', 'leroy merlin', 'casas bahia', 'etna', 'ikea', 'shoptime', 'mobly', 'hogar', 'decoração', 'móveis', 'cama mesa', 'utilidades', 'eletrodoméstico'],
  assinaturas_card: ['netflix', 'spotify', 'deezer', 'amazon prime', 'hbo', 'disney', 'apple', 'google one', 'youtube', 'globoplay', 'star+', 'paramount', 'mubi', 'duolingo', 'adobe', 'microsoft', 'dropbox', 'notion', 'figma', 'chatgpt', 'openai', 'crunchyroll', 'linkedin premium'],
  transporte_app:   ['uber ', 'cabify', '99 ', 'localiza', 'movida', 'hertz', 'empresa de transporte', 'onibus', 'ônibus', 'metro', 'metrô', 'bilhete único', 'passagem'],
  carro:            ['shell', 'ipiranga', 'br dist', 'posto ', 'gasolina', 'combustível', 'etanol', 'detran', 'ipva', 'dpvat', 'licenciamento', 'funilaria', 'mecânica', 'autopeças', 'pneu', 'estaleiro', 'auto '],
  farmacia:         ['drogasil', 'droga raia', 'ultrafarma', 'farmácia', 'farmacia', 'drogaria', 'pague menos', 'onofre', 'nissei', 'panvel', 'remédio', 'exame'],
  beleza_estetica:  ['salão', 'salao', 'barbearia', 'estética', 'estetica', 'manicure', 'cabeleireiro', 'studio', 'spa', 'maquiagem', 'dermato', 'waxing', 'by kamy', 'sephora', 'o boticário', 'boticario', 'natura', 'avon', 'beleza'],
  presentes:        ['presente', 'doação', 'doacao', 'gift', 'flores', 'buque', 'zee.dog', 'fnac', 'livraria', 'saraiva', 'cultura'],
  pets:             ['petshop', 'petz', 'cobasi', 'ração', 'racao', 'pet ', 'veterinário', 'vet ', 'aquário'],
  educacao:         ['escola', 'faculdade', 'universidade', 'curso', 'mensalidade', 'matrícula', 'colegio', 'colégio', 'alura', 'udemy', 'coursera', 'rocketseat', 'kumon', 'inglês', 'ingles', 'aula '],
  seguros:          ['prudential', 'seguro', 'seguradora', 'porto seguro', 'bradesco seguros', 'sulamerica', 'zurich', 'allianz', 'mapfre', 'tokio marine', 'vida segur', 'previdência'],
  iof:              ['iof', 'imp. s/ oper', 'imposto operacao', 'imposto operação', 'tributo federal'],
}

export function autoCategory(description) {
  const lower = description.toLowerCase()
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return cat
  }
  return null // não categorizado — fica em aberto
}

// ─── Utilitários de parsing ───────────────────────────────────
const parseAmount = (str) => {
  if (!str) return 0
  // Remove R$, espaços; trata vírgula como decimal
  const clean = str.replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '')
  return parseFloat(clean) || 0
}

const parseDate = (str, year) => {
  if (!str) return null
  const months = { jan:1,fev:2,mar:3,abr:4,mai:5,jun:6,jul:7,ago:8,set:9,out:10,nov:11,dez:12 }
  // DD/MM/YYYY ou DD/MM/YY
  let m = str.match(/(\d{2})\/(\d{2})\/(\d{2,4})/)
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3]
    return `${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`
  }
  // DD/MM (sem ano)
  m = str.match(/(\d{2})\/(\d{2})/)
  if (m) return `${year || new Date().getFullYear()}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`
  // DD MMM
  m = str.match(/(\d{1,2})\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)/i)
  if (m) {
    const mo = String(months[m[2].toLowerCase()]).padStart(2,'0')
    return `${year || new Date().getFullYear()}-${mo}-${m[1].padStart(2,'0')}`
  }
  return null
}

const uid = () => Math.random().toString(36).slice(2)

// ─── Extrai texto do PDF ────────────────────────────────────
export async function extractPdfText(file) {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  let fullText = ''
  const pageTexts = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    // Agrupa itens por posição Y (linha) para reconstruir linhas de texto
    const items = content.items
    const byY = {}
    items.forEach(item => {
      const y = Math.round(item.transform[5])
      if (!byY[y]) byY[y] = []
      byY[y].push({ x: item.transform[4], text: item.str })
    })
    const lines = Object.entries(byY)
      .sort((a, b) => b[0] - a[0])
      .map(([, items]) => items.sort((a, b) => a.x - b.x).map(i => i.text).join(' ').trim())
      .filter(l => l.length > 0)

    pageTexts.push(lines)
    fullText += lines.join('\n') + '\n'
  }

  return { fullText, pageTexts }
}

// ─── Detecta banco pelo conteúdo do PDF ─────────────────────
export function detectBank(text) {
  const t = text.toLowerCase()
  if (t.includes('inter') || t.includes('banco inter')) return 'inter'
  if (t.includes('bradesco')) return 'bradesco'
  if (t.includes('santander')) return 'santander'
  if (t.includes('sofisa')) return 'sofisa'
  if (t.includes('nubank') || t.includes('nu pagamentos')) return 'nubank'
  if (t.includes('itaú') || t.includes('itau')) return 'itau'
  if (t.includes('c6 bank') || t.includes('c6bank')) return 'c6'
  return 'generic'
}

// ─── Parsers por banco ───────────────────────────────────────

// Padrão genérico — tenta identificar linhas com data + descrição + valor
function parseGeneric(lines, year) {
  const transactions = []
  const datePattern = /\b(\d{2}\/\d{2}(\/\d{2,4})?|\d{2}\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\b)/i
  const amountPattern = /(\d{1,3}(?:\.\d{3})*,\d{2})/

  lines.forEach(line => {
    if (line.length < 10) return
    // Ignora linhas de totais, cabeçalhos, saldo
    const lower = line.toLowerCase()
    if (/total|saldo|limite|vencimento|pagamento mínimo|fatura|bandeira|agência|conta corrente/.test(lower)) return

    const dateM = line.match(datePattern)
    // Pega todos os valores em formato BRL (1.234,56) e usa o ÚLTIMO — ignora colunas USD
    const allAmts = [...line.matchAll(/(\d{1,3}(?:\.\d{3})*,\d{2})/g)]
    const amtM = allAmts.length > 0 ? allAmts[allAmts.length - 1] : null
    if (!dateM || !amtM) return

    const date   = parseDate(dateM[0], year)
    const amount = parseAmount(amtM[1])
    if (!date || amount <= 0 || amount > 50000) return

    // Remove date e amount da linha para obter a descrição
    let desc = line
      .replace(dateM[0], '')
      .replace(amtM[1], '')
      .replace(/R\$/, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
    if (desc.length < 2) return

    // Detecta parcelamento: "Parcela X/Y" ou "02/10"
    let installmentNumber = 1, installmentTotal = 1
    const parcelM = desc.match(/\b(\d{1,2})\/(\d{1,2})\b/)
    if (parcelM && parseInt(parcelM[2]) > 1) {
      installmentNumber = parseInt(parcelM[1])
      installmentTotal  = parseInt(parcelM[2])
      desc = desc.replace(parcelM[0], '').trim()
    }

    transactions.push({
      id: uid(),
      date,
      description: desc,
      amount,
      installmentNumber,
      installmentTotal,
      installmentAmount: amount,
      category: autoCategory(desc),
      person: null, // a ser definido pelo usuário
    })
  })

  return transactions
}

// Inter — faturas em PDF com formato tabular limpo
function parseInter(lines, year) {
  const transactions = []
  let inBody = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/data\s+histórico/i.test(line) || /data\s+lançamento/i.test(line)) { inBody = true; continue }
    if (!inBody) continue
    if (/total\s+fatura|valor\s+total|pagamento/i.test(line)) break

    // Inter: "DD/MM  Descrição  R$ 123,45" ou "DD/MM  Descrição  123,45"
    const m = line.match(/^(\d{2}\/\d{2}(?:\/\d{2,4})?)\s+(.+?)\s+([\d.,]+)\s*$/)
    if (!m) {
      // Tenta padrão genérico
      const generic = parseGeneric([line], year)
      transactions.push(...generic)
      continue
    }

    const date = parseDate(m[1], year)
    const amount = parseAmount(m[3])
    if (!date || amount <= 0) continue

    let desc = m[2].trim()
    let installmentNumber = 1, installmentTotal = 1
    const pM = desc.match(/(\d{2})\/(\d{2})\s*$/i)
    if (pM && parseInt(pM[2]) > 1) {
      installmentNumber = parseInt(pM[1]); installmentTotal = parseInt(pM[2])
      desc = desc.replace(pM[0], '').trim()
    }

    transactions.push({ id: uid(), date, description: desc, amount, installmentNumber, installmentTotal, installmentAmount: amount, category: autoCategory(desc), person: null })
  }

  return transactions.length > 0 ? transactions : parseGeneric(lines, year)
}

// Bradesco
function parseBradesco(lines, year) {
  return parseGeneric(lines, year) // fallback genérico funciona bem para Bradesco
}

// Santander
function parseSantander(lines, year) {
  const transactions = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // Santander tende a ter: "DD/MM/AAAA  Descrição  123,45"
    const m = line.match(/(\d{2}\/\d{2}\/\d{4})\s+(.{5,60}?)\s+([\d.]+,\d{2})\s*$/)
    if (!m) continue
    const date = parseDate(m[1], year)
    const amount = parseAmount(m[3])
    if (!date || amount <= 0 || amount > 50000) continue
    let desc = m[2].trim()
    const lower = desc.toLowerCase()
    if (/pagamento|saldo anterior|limite/.test(lower)) continue
    transactions.push({ id: uid(), date, description: desc, amount, installmentNumber: 1, installmentTotal: 1, installmentAmount: amount, category: autoCategory(desc), person: null })
  }
  return transactions.length > 2 ? transactions : parseGeneric(lines, year)
}

// Sofisa
function parseSofisa(lines, year) {
  return parseGeneric(lines, year)
}

// ─── Entry point ─────────────────────────────────────────────
export async function parseCreditCardPDF(file, forcedBank) {
  const { fullText, pageTexts } = await extractPdfText(file)
  const bank = forcedBank || detectBank(fullText)
  const lines = pageTexts.flat()

  // Determina ano da fatura pelo texto
  const yearM = fullText.match(/20\d{2}/)
  const year = yearM ? parseInt(yearM[0]) : new Date().getFullYear()

  let transactions
  switch (bank) {
    case 'inter':     transactions = parseInter(lines, year); break
    case 'bradesco':  transactions = parseBradesco(lines, year); break
    case 'santander': transactions = parseSantander(lines, year); break
    case 'sofisa':    transactions = parseSofisa(lines, year); break
    default:          transactions = parseGeneric(lines, year)
  }

  // Deduplica por (date + description + amount)
  const seen = new Set()
  const deduped = transactions.filter(tx => {
    const key = `${tx.date}|${tx.description.toLowerCase().slice(0,20)}|${tx.amount}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return { transactions: deduped, bank, totalLines: lines.length }
}
