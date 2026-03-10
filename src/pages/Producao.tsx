import { useState, useEffect, useRef } from 'react'
import { BookOpen, ExternalLink, Search, BarChart3, FileText, BookMarked, Presentation, Award, Upload, Download, X } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/ui/toast'
import { loadProducao, savePublicacao } from '@/lib/githubStorage'
import type { Publicacao } from '@/types'

type ProducaoItem = Publicacao

const _NOW = new Date().toISOString()
const _D = { user_id: 'demo-user-id', created_at: _NOW, updated_at: _NOW }

const DEMO_PRODUCAO: ProducaoItem[] = [
  { ..._D, id: '1', tipo: 'artigo', titulo: 'Deep Learning for Educational Data Mining: A Systematic Review', autores: ['João Silva', 'Ana Mendes', 'Bruno Lima'], ano: 2024, venue: 'Computers & Education', doi: '10.1016/j.compedu.2024.001', qualis: 'A1', citacoes: 12 },
  { ..._D, id: '2', tipo: 'artigo', titulo: 'Predicting Student Dropout Using Random Forest Ensembles', autores: ['João Silva', 'Carla Nunes'], ano: 2023, venue: 'Journal of Learning Analytics', qualis: 'A2', citacoes: 28 },
  { ..._D, id: '3', tipo: 'artigo', titulo: 'Natural Language Processing in Educational Chatbots', autores: ['Bruno Lima', 'João Silva'], ano: 2023, venue: 'Educational Technology & Society', qualis: 'A1', citacoes: 7 },
  { ..._D, id: '4', tipo: 'capitulo', titulo: 'Inteligência Artificial na Educação: Perspectivas e Desafios', autores: ['João Silva'], ano: 2024, venue: 'Inovações Tecnológicas na Educação (Org. Maria Santos)', citacoes: 3 },
  { ..._D, id: '5', tipo: 'congresso', titulo: 'LLM-based Feedback Generation for Programming Exercises', autores: ['Bruno Lima', 'João Silva', 'Ana Mendes'], ano: 2024, venue: 'ICALT 2024 — IEEE International Conference on Advanced Learning Technologies', citacoes: 2 },
  { ..._D, id: '6', tipo: 'congresso', titulo: 'Sentiment Analysis in Online Discussion Forums for Learning Analytics', autores: ['Carla Nunes', 'João Silva'], ano: 2023, venue: 'SBIE 2023 — Simpósio Brasileiro de Informática na Educação', citacoes: 5 },
  { ..._D, id: '7', tipo: 'livro', titulo: 'Mineração de Dados Educacionais: Teoria e Prática', autores: ['João Silva', 'Maria Santos'], ano: 2023, venue: 'Editora Brasport', citacoes: 15 },
]

const TIPO_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; bg: string; text: string }> = {
  artigo: { label: 'Artigos', icon: FileText, bg: 'bg-blue-100', text: 'text-blue-700' },
  capitulo: { label: 'Capítulos', icon: BookMarked, bg: 'bg-teal-100', text: 'text-teal-700' },
  congresso: { label: 'Congressos', icon: Presentation, bg: 'bg-purple-100', text: 'text-purple-700' },
  livro: { label: 'Livros', icon: BookOpen, bg: 'bg-orange-100', text: 'text-orange-700' },
  patente: { label: 'Patentes', icon: Award, bg: 'bg-pink-100', text: 'text-pink-700' },
  outro: { label: 'Outros', icon: FileText, bg: 'bg-gray-100', text: 'text-gray-700' },
}

const QUALIS_COLORS: Record<string, string> = {
  'A1': 'bg-green-100 text-green-800',
  'A2': 'bg-green-50 text-green-700',
  'A3': 'bg-blue-100 text-blue-700',
  'A4': 'bg-blue-50 text-blue-600',
  'B1': 'bg-yellow-100 text-yellow-700',
  'B2': 'bg-yellow-50 text-yellow-600',
  'C': 'bg-red-100 text-red-600',
}

type PartialPub = Omit<ProducaoItem, 'user_id' | 'created_at' | 'updated_at'>

// Clone an element, strip decorative/metadata child nodes, return clean plain text
function getCleanText(el: Element): string {
  const clone = el.cloneNode(true) as Element
  clone.querySelectorAll(
    '.informacao-artigo, .citado, a.icone-producao, sup, a[class*="icone"], span[class*="icone"]'
  ).forEach(n => n.remove())
  return (clone.textContent ?? '').replace(/\s+/g, ' ').trim()
}

// Maps Lattes anchor[name] values to publication types.
// Unknown anchors set currentTipo to null → items in those sections are skipped.
const ANCHOR_TIPO_MAP: Record<string, ProducaoItem['tipo']> = {
  ArtigosCompletos: 'artigo',
  ArtigosAceitos: 'artigo',
  LivrosCapitulos: 'livro',               // chapters reclassified via ". In: " detection
  TrabalhosPublicadosAnaisCongresso: 'congresso',
  ResumosExpandidos: 'congresso',
  ApresentacoesTrabalho: 'congresso',
  TextosJornaisRevistas: 'outro',
  OutrasProducoesBibliograficas: 'outro',
  PatentesRegistros: 'patente',
  MarcaRegistrada: 'patente',
  marca: 'patente',
}

function parseLattesCitation(
  text: string,
  tipo: ProducaoItem['tipo'],
  id: string,
  overrideAno?: number,
  overrideDoi?: string,
  citacoes?: number,
): PartialPub | null {
  if (!text || text.length < 15) return null

  const yearMatch = text.match(/\b(19[5-9]\d|20[0-3]\d)\b/)
  const ano = overrideAno ?? (yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear())

  const doiMatch = text.match(/10\.\d{4,}\/[^\s,;?#]+/)
  const doi = overrideDoi ?? (doiMatch ? doiMatch[0].replace(/[.,;]+$/, '') : undefined)

  let titulo = text
  let autores: string[] = []
  let venue: string | undefined
  // Reclassify livro → capitulo when the entry embeds a host book (". In: ")
  let finalTipo: ProducaoItem['tipo'] = (tipo === 'livro' && text.includes('. In: ')) ? 'capitulo' : tipo

  // Standard Lattes citation: "AUTHORS. Title. Venue, vol, year."
  // Split on ". " followed by an uppercase/quote — handles accented Portuguese initials too
  const parts = text.split(/\.\s+(?=[A-ZÁÉÍÓÚÀÃÕÂÊÔÜÇ"(])/u)
  if (parts.length >= 2) {
    const authorPart = parts[0].trim()
    // Author block: last-name, initials; last-name2, initials2 — typically < 300 chars
    if (authorPart.includes(',') && authorPart.length < 300) {
      autores = authorPart.split(/;\s*/).map(a => a.trim()).filter(Boolean)
    }
    if (parts[1]?.trim().length > 5) {
      titulo = parts[1].trim()
    }
    if (parts.length > 2) {
      venue = parts.slice(2).join('. ').trim().replace(/\s+/g, ' ').slice(0, 200)
    }
  }

  if (titulo.length < 5) return null
  return { id, tipo: finalTipo, titulo: titulo.slice(0, 300), autores, ano, venue, doi, citacoes }
}

function parseLattesHTML(html: string): PartialPub[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const items: PartialPub[] = []
  let counter = 0
  function nextId() { return `imported-${++counter}` }

  // ── Pass 1: journal articles ────────────────────────────────────────────────
  // Lattes renders journal articles in a dedicated #artigos-completos container
  // with rich per-entry metadata (year, DOI, citation count).
  const artigosContainer = doc.querySelector('#artigos-completos')
  if (artigosContainer) {
    artigosContainer.querySelectorAll('.artigo-completo').forEach(artEl => {
      // Year — dedicated sorting span
      const yearEl = artEl.querySelector('[data-tipo-ordenacao="ano"]')
      const anoRaw = parseInt(yearEl?.textContent?.trim() ?? '')
      const ano = isNaN(anoRaw) ? undefined : anoRaw

      // DOI — link to dx.doi.org or doi.org
      const doiEl = artEl.querySelector('a[href*="doi.org"]')
      const doiHref = doiEl?.getAttribute('href') ?? ''
      const doiMatch = doiHref.match(/10\.\d{4,}\/[^\s,;?#]+/)
      const doi = doiMatch ? doiMatch[0].replace(/[.,;]+$/, '') : undefined

      // Citation count — inside .numero-citacao
      const citEl = artEl.querySelector('.numero-citacao')
      const citStr = citEl?.textContent?.replace(/\D/g, '') ?? ''
      const citacoes = citStr ? parseInt(citStr) : undefined

      // Citation text — inside .layout-cell-11 span.transform
      const textEl = artEl.querySelector('.layout-cell-11 .transform, .layout-cell-11 span')
      if (!textEl) return
      const text = getCleanText(textEl)
      if (!text || text.length < 10) return

      const parsed = parseLattesCitation(text, 'artigo', nextId(), ano, doi, citacoes)
      if (parsed) items.push(parsed)
    })
  }

  // ── Pass 2: all other bibliographic sections via anchor navigation ──────────
  // Walk the DOM in document order. Named anchors act as section headers;
  // span.transform inside .layout-cell-11 are the individual entries.
  // Setting currentTipo=null for unknown anchors naturally skips non-bibliographic
  // sections (ProducaoTecnica, Bancas, Orientacoes, etc.) without an explicit stop.
  const allNodes = Array.from(doc.querySelectorAll(
    'a[name], .layout-cell-11 > span.transform'
  ))
  let currentTipo: ProducaoItem['tipo'] | null = null

  for (const node of allNodes) {
    if (node.tagName === 'A' && node.hasAttribute('name')) {
      const anchorName = node.getAttribute('name') ?? ''
      currentTipo = ANCHOR_TIPO_MAP[anchorName] ?? null
      continue
    }

    if (!currentTipo) continue
    // Already captured in Pass 1
    if (node.closest('#artigos-completos')) continue

    const text = getCleanText(node)
    if (!text || text.length < 15) continue

    const parsed = parseLattesCitation(text, currentTipo, nextId())
    if (parsed) items.push(parsed)
  }

  return items
}

function exportXLS(items: ProducaoItem[]) {
  const wb = XLSX.utils.book_new()
  const tipos = [...new Set(items.map(i => i.tipo))]
  tipos.forEach(tipo => {
    const rows = items.filter(i => i.tipo === tipo).map(i => ({
      Título: i.titulo, Autores: i.autores.join('; '), Ano: i.ano,
      Venue: i.venue ?? '', DOI: i.doi ?? '', Qualis: i.qualis ?? '', Citações: i.citacoes ?? '',
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), tipo.slice(0, 31))
  })
  XLSX.writeFile(wb, 'producao.xlsx')
}

function exportCSV(items: ProducaoItem[]) {
  const rows = items.map(i => [i.titulo, i.autores.join('; '), i.ano, i.tipo, i.venue ?? '', i.doi ?? ''].join('\t'))
  const csv = ['Título\tAutores\tAno\tTipo\tVenue\tDOI', ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'producao.csv'; a.click()
  URL.revokeObjectURL(url)
}

function exportPDF(items: ProducaoItem[]) {
  const doc = new jsPDF()
  doc.setFontSize(14); doc.text('Produção Científica', 14, 20)
  autoTable(doc, {
    startY: 28,
    head: [['Tipo', 'Título', 'Autores', 'Ano', 'Venue']],
    body: items.map(i => [i.tipo, i.titulo.slice(0, 60), i.autores.slice(0, 2).join('; '), String(i.ano), (i.venue ?? '').slice(0, 40)]),
    styles: { fontSize: 7 },
    headStyles: { fillColor: [15, 118, 110] },
  })
  doc.save('producao.pdf')
}

export function Producao() {
  const { isDemoMode } = useAuth()

  const { toasts, toast, dismiss } = useToast()

  const [producao, setProducao] = useState<ProducaoItem[]>(isDemoMode ? DEMO_PRODUCAO : [])
  const [loading, setLoading] = useState(!isDemoMode)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('todos')
  const [importing, setImporting] = useState(false)
  const [importPreview, setImportPreview] = useState<ProducaoItem[] | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isDemoMode) return
    loadProducao().then(data => { setProducao(data); setLoading(false) })
      .catch(err => { toast({ title: 'Erro ao carregar', description: err.message, variant: 'destructive' }); setLoading(false) })
  }, [isDemoMode])

  const filtered = producao.filter(p => {
    const matchSearch = !search ||
      p.titulo.toLowerCase().includes(search.toLowerCase()) ||
      p.autores.some(a => a.toLowerCase().includes(search.toLowerCase())) ||
      (p.venue ?? '').toLowerCase().includes(search.toLowerCase())
    const matchTab = activeTab === 'todos' || p.tipo === activeTab
    return matchSearch && matchTab
  })

  const totalCitacoes = producao.reduce((s, p) => s + (p.citacoes ?? 0), 0)
  const artigos = producao.filter(p => p.tipo === 'artigo')
  const a1a2 = artigos.filter(p => p.qualis === 'A1' || p.qualis === 'A2').length

  async function handleLattesFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)

    // Detect the declared charset before full decoding.
    // Lattes HTML files are typically ISO-8859-1; reading as UTF-8 garbles accents.
    // The <meta charset="..."> tag is ASCII, so a lenient UTF-8 peek is enough to find it.
    const buffer = await file.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    const peek = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 2048))
    const charsetMatch = peek.match(/charset=["']?\s*([\w-]+)/i)
    const declared = (charsetMatch?.[1] ?? 'utf-8').toLowerCase()
    // WHATWG encoding standard: iso-8859-1, latin1, windows-1252 all map to windows-1252
    const encoding =
      declared.includes('iso-8859') || declared.includes('latin') || declared === 'windows-1252'
        ? 'windows-1252'
        : 'utf-8'
    const html = new TextDecoder(encoding).decode(bytes)

    const parsed = parseLattesHTML(html)
    const now = new Date().toISOString()
    setImportPreview(parsed.map(p => ({ ...p, user_id: isDemoMode ? 'demo-user-id' : 'github-user', created_at: now, updated_at: now })))
    setImporting(false)
    e.target.value = ''
  }

  return (
    <div className="animate-fade-in space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Produção Científica</h1>
            <p className="text-sm text-gray-500">Publicações, capítulos, livros e congressos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".html,.htm"
            className="hidden"
            onChange={handleLattesFile}
          />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            <Upload className="w-4 h-4" />
            {importing ? 'Importando...' : 'Importar do Lattes'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-4 h-4 text-teal-600" />
              <p className="text-xs text-gray-500">Total Publicações</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">{producao.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-blue-600" />
              <p className="text-xs text-gray-500">Artigos</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">{artigos.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-4 h-4 text-green-600" />
              <p className="text-xs text-gray-500">A1/A2 Qualis</p>
            </div>
            <p className="text-3xl font-bold text-green-700">{a1a2}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-purple-600" />
              <p className="text-xs text-gray-500">Total Citações</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalCitacoes}</p>
          </CardContent>
        </Card>
      </div>

      {/* Export buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => exportXLS(filtered)}>
          <FileText className="w-4 h-4" /> XLS
        </Button>
        <Button variant="outline" size="sm" onClick={() => exportCSV(filtered)}>
          <Download className="w-4 h-4" /> CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => exportPDF(filtered)}>
          <FileText className="w-4 h-4" /> PDF
        </Button>
      </div>

      {/* Lattes notice */}
      <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <BookOpen className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-teal-800">Integração com Lattes</p>
            <p className="text-sm text-teal-700 mt-0.5">
              Este módulo suporta importação do currículo Lattes via arquivo HTML.
              Salve a página do seu currículo Lattes como HTML e use o botão "Importar do Lattes".
            </p>
          </div>
        </div>
      </div>

      {/* Filter + list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-teal-500 rounded-full animate-spin" />
        </div>
      ) : null}
      <div className={`space-y-4 ${loading ? 'hidden' : ''}`}>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por título, autor, venue..."
            className="pl-9"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="todos">Todos ({producao.length})</TabsTrigger>
            {Object.entries(TIPO_CONFIG).map(([key, cfg]) => {
              const count = producao.filter(p => p.tipo === key).length
              if (count === 0) return null
              return (
                <TabsTrigger key={key} value={key}>
                  {cfg.label} ({count})
                </TabsTrigger>
              )
            })}
          </TabsList>

          {['todos', ...Object.keys(TIPO_CONFIG)].map(tab => (
            <TabsContent key={tab} value={tab} className="space-y-3 mt-4">
              {filtered.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <BookOpen className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">Nenhuma publicação encontrada</p>
                </div>
              ) : (
                filtered.map(p => {
                  const cfg = TIPO_CONFIG[p.tipo]
                  if (!cfg) return null
                  const Icon = cfg.icon
                  return (
                    <Card key={p.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                            <Icon className={`w-4 h-4 ${cfg.text}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 leading-snug">{p.titulo}</p>
                            <p className="text-sm text-gray-500 mt-0.5">{p.autores.join(', ')}</p>
                            {p.venue && <p className="text-sm text-gray-500 italic mt-0.5">{p.venue}</p>}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">{p.ano}</Badge>
                              <Badge className={`${cfg.bg} ${cfg.text} border-0 text-xs`}>{cfg.label}</Badge>
                              {p.qualis && (
                                <Badge className={`${QUALIS_COLORS[p.qualis] ?? 'bg-gray-100 text-gray-700'} border-0 text-xs`}>
                                  Qualis {p.qualis}
                                </Badge>
                              )}
                              {p.citacoes != null && p.citacoes > 0 && (
                                <span className="text-xs text-gray-400">
                                  {p.citacoes} citação{p.citacoes !== 1 ? 'ões' : ''}
                                </span>
                              )}
                              {p.doi && (
                                <a
                                  href={`https://doi.org/${p.doi}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
                                >
                                  <ExternalLink className="w-3 h-3" />DOI
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Import preview dialog */}
      <Dialog open={importPreview !== null} onOpenChange={open => { if (!open) setImportPreview(null) }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importação do Lattes</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-gray-600">
              Encontradas <span className="font-semibold">{importPreview?.length ?? 0}</span> publicações. Deseja importar?
            </p>
            <div className="space-y-2">
              {importPreview?.slice(0, 10).map(item => {
                const cfg = TIPO_CONFIG[item.tipo]
                return (
                  <div key={item.id} className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100">
                    <Badge className={`${cfg?.bg ?? 'bg-gray-100'} ${cfg?.text ?? 'text-gray-700'} border-0 text-xs flex-shrink-0 mt-0.5`}>
                      {item.tipo}
                    </Badge>
                    <p className="text-sm text-gray-800 leading-snug">{item.titulo}</p>
                  </div>
                )
              })}
              {(importPreview?.length ?? 0) > 10 && (
                <p className="text-xs text-gray-400 text-center">
                  ...e mais {(importPreview?.length ?? 0) - 10} publicações
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportPreview(null)}>
              <X className="w-4 h-4" /> Cancelar
            </Button>
            <Button onClick={async () => {
              const items = importPreview ?? []
              if (!isDemoMode) {
                const now = new Date().toISOString()
                const ghItems = items.map(item => ({ ...item, id: crypto.randomUUID(), user_id: 'github-user', created_at: now, updated_at: now }))
                try {
                  await Promise.all(ghItems.map(p => savePublicacao(p)))
                } catch (err: any) { toast({ title: 'Erro ao importar', description: err.message, variant: 'destructive' }); return }
                setProducao(prev => [...ghItems, ...prev])
              } else {
                setProducao(prev => [...items, ...prev])
              }
              toast({ title: `${items.length} publicações importadas` })
              setImportPreview(null)
            }}>
              Importar Tudo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
