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
  viagem:           ['passagem aérea', 'latam', 'gol ', 'azul ', 'ryanair', 'ethiopian', 'booking', 'airbnb', 'hotel', 'hostel', 'pousada', 'resort', 'klook', 'getyourguide', 'gettyourguide', 'tripadvisor', 'aeroporto', 'bagagem', 'mala ', 'visa ', 'passaporte', 'embassy', 'câmbio', 'cambio', 'fancypods', 'attagirl', 'cosme', 'kyoto', 'osaka', 'shibuya', 'iof internacional'],
  plano_celular:    ['claro', 'vivo ', 'tim ', 'oi ', 'nextel', 'algar', 'porto connect', 'recarga celular', 'recarga ', 'crédito celular', 'plano celular'],
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
  // "DD de MMM. YYYY" — formato Inter (ex: "01 de abr. 2026")
  m = str.match(/(\d{1,2})\s+de\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\.?\s+(\d{4})/i)
  if (m) {
    const mo = String(months[m[2].toLowerCase()]).padStart(2,'0')
    return `${m[3]}-${mo}-${m[1].padStart(2,'0')}`
  }
  // DD MMM (sem "de", sem ano)
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
    const amtM  = line.match(/(\d{1,3}(?:\.\d{3})*,\d{2})/)
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

// Inter — formato atual: "DD de MMM. YYYY  Descrição  -  R$ X.XXX,XX"
// Cabeçalho de seção: "CARTÃO XXXX****XXXX"
// Coluna Beneficiário: sempre "-"
// Compras internacionais: linhas extras de câmbio (ignoradas)
// Pagamentos: "+ R$ X" (ignorados)
function parseInter(lines, year) {
  const transactions = []
  let inBody = false

  // Regex para data no formato Inter: "DD de MMM. YYYY"
  const interDateRe = /^(\d{1,2}\s+de\s+(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\.?\s+\d{4})/i

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Inicia corpo ao encontrar seção de cartão ou cabeçalho de coluna
    if (/^CARTÃO\s+\d{4}\*+\d{4}/i.test(line) || /^data\s+movimenta/i.test(line)) {
      inBody = true
      continue
    }

    if (!inBody) continue

    // Pula linhas de cabeçalho, totais e metadados de câmbio
    if (/^data\s+movimenta/i.test(line))                   continue
    if (/^total\s+cartão/i.test(line))                     continue
    if (/^valor\s+e\s+símbolo\s+da\s+moeda/i.test(line))   continue
    if (/^valor\s+em\s+dólar/i.test(line))                  continue
    if (/^cotação\s+do\s+dólar/i.test(line))                continue
    if (/^beneficiário/i.test(line))                        continue
    if (line === '-' || line.length < 5)                   continue

    // Identifica linha de transação pela data no início
    const dateM = line.match(interDateRe)
    if (!dateM) continue

    const date = parseDate(dateM[1], year)
    if (!date) continue

    // Resto da linha após a data
    const rest = line.slice(dateM[0].length).trim()

    // Pula pagamentos (valor positivo, precedido de "+")
    if (/\+\s*R\$/.test(rest)) continue

    // Extrai o valor: último "R$ X.XXX,XX" da linha
    const amtM = rest.match(/R\$\s*([\d.]+,\d{2})\s*$/)
    if (!amtM) continue

    const amount = parseAmount(amtM[1])
    if (amount <= 0) continue

    // Descrição: tudo entre a data e o valor, removendo "-" do Beneficiário
    let desc = rest
      .slice(0, rest.lastIndexOf(amtM[0]))
      .replace(/\s+-\s*$/, '')   // remove coluna Beneficiário ("-")
      .replace(/\s{2,}/g, ' ')
      .trim()

    if (desc.length < 2) continue

    // Detecta parcelamento: "(Parcela 02 de 06)"
    let installmentNumber = 1, installmentTotal = 1
    const parcelM = desc.match(/\(Parcela\s+(\d{1,2})\s+de\s+(\d{1,2})\)/i)
    if (parcelM) {
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
      person: null,
    })
  }

  // Fallback para o parser genérico se nenhuma transação foi encontrada
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

// Sofisa — formato multi-coluna: Data | Descrição | Valor Original (pode ser moeda
// estrangeira, ex: JPY) | Valor Equivalente US$ | Taxa Conversão | Valor em Real
// O parser genérico falha porque captura o 1º valor numérico da linha (ex: JPY 83.720,00 → 83720,
// descartado por > 50000) em vez do último (Valor em Real). A correção usa sempre o ÚLTIMO valor.
function parseSofisa(lines, year) {
  const transactions = []
  const amtRe = /(\d{1,3}(?:\.\d{3})*,\d{2})/g
  const dateRe = /^(\d{2}\/\d{2}\/\d{2,4})\s/

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.length < 10) continue

    const lower = trimmed.toLowerCase()
    if (/valor total|saldo total|total a pagar|fechamento|vencimento|demais encargos|compras parceladas/.test(lower)) continue

    const dateM = trimmed.match(dateRe)
    if (!dateM) continue

    const date = parseDate(dateM[1], year)
    if (!date) continue

    // Todos os valores numéricos da linha
    const matches = [...trimmed.matchAll(amtRe)]
    if (matches.length === 0) continue

    // Último valor = Valor em Real (em compras estrangeiras há colunas intermediárias)
    const lastMatch = matches[matches.length - 1]
    const amount = parseAmount(lastMatch[1])
    if (amount <= 0 || amount > 50000) continue

    // Descrição: entre o fim da data e o início do 1º valor numérico
    const firstAmt = matches[0]
    let desc = trimmed.slice(dateM[0].length, firstAmt.index).trim()

    // Limpa código de moeda estrangeira no fim (ex: "JPY", "USD")
    desc = desc.replace(/\s+[A-Z]{3}\s*$/, '')
    // Limpa "R$ -" e "R$" soltos
    desc = desc.replace(/R\$\s*-\s*/g, '').replace(/R\$\s*(?!\d)/g, '')
    desc = desc.replace(/\s{2,}/g, ' ').trim()
    if (desc.length < 2) continue

    // Detecta parcelamento
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
      person: null,
    })
  }

  return transactions.length > 0 ? transactions : parseGeneric(lines, year)
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
