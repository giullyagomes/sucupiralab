import { useState, useEffect, useRef } from 'react'
import {
  Plus, GraduationCap, Pencil, Trash2, FileText, ChevronDown, ChevronUp,
  BookOpen, Link2, Paperclip, Download, X, CalendarDays,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useDemoData } from '@/hooks/useDemoData'
import { useToast } from '@/hooks/useToast'
import { loadOrientacoes, saveOrientacaoFile, deleteOrientacaoFile, uploadAnexo } from '@/lib/githubStorage'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ToastContainer } from '@/components/ui/toast'
import type { Orientacao, Tarefa, NotaReuniao, Anexo } from '@/types'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

/* ─── Helpers ─────────────────────────────────────────────────────────── */

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function downloadNotasMarkdown(o: Orientacao) {
  const reunioes = o.reunioes ?? []
  const sorted = [...reunioes].sort((a, b) => {
    if (a.data && b.data) return b.data.localeCompare(a.data)
    if (a.data) return -1
    if (b.data) return 1
    return 0
  })
  const lines: string[] = [
    `# Notas de Orientação`,
    ``,
    `**Orientado(a):** ${o.nome_orientando}`,
    `**Curso:** ${o.curso}`,
  ]
  if (o.titulo_provisorio) lines.push(`**Título Provisório:** ${o.titulo_provisorio}`)
  if (o.ano_ingresso) lines.push(`**Ano de Ingresso:** ${o.ano_ingresso}`)
  if (o.previsao_conclusao) lines.push(`**Previsão de Conclusão:** ${o.previsao_conclusao}`)
  lines.push(``, `---`, ``)
  if (sorted.length === 0) {
    lines.push(`_Nenhuma anotação registrada._`)
  } else {
    sorted.forEach(r => {
      lines.push(r.data ? `## ${r.data}` : `## (sem data)`)
      lines.push(``, r.texto, ``)
    })
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `reunioes-${o.nome_orientando.replace(/\s+/g, '-').toLowerCase()}.md`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function exportPDF(orientacoes: Orientacao[]) {
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text('Orientações', 14, 22)
  autoTable(doc, {
    startY: 30,
    head: [['Orientado(a)', 'Curso', 'Título Provisório', 'Ingresso', 'Conclusão']],
    body: orientacoes.map(o => [
      o.nome_orientando, o.curso, o.titulo_provisorio ?? '—',
      o.ano_ingresso ? String(o.ano_ingresso) : '—', o.previsao_conclusao ?? '—',
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [190, 24, 93] },
  })
  doc.save('orientacoes.pdf')
}

function exportExcel(orientacoes: Orientacao[]) {
  const ws = XLSX.utils.json_to_sheet(orientacoes.map(o => ({
    'Orientado(a)': o.nome_orientando,
    Curso: o.curso,
    'Título Provisório': o.titulo_provisorio ?? '',
    'Ano Ingresso': o.ano_ingresso ?? '',
    'Previsão Conclusão': o.previsao_conclusao ?? '',
    'Exame de Qualificação': o.exame_qualificacao ? 'Sim' : '',
  })))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Orientações')
  XLSX.writeFile(wb, 'orientacoes.xlsx')
}

/* ─── Constants ───────────────────────────────────────────────────────── */

const CURSOS = ['Doutorado', 'Mestrado', 'Iniciação Científica', 'TCC', 'Pós-Doutorado']

const CURSO_COLORS: Record<string, string> = {
  Doutorado: 'bg-pink-100 text-pink-700',
  Mestrado: 'bg-purple-100 text-purple-700',
  'Iniciação Científica': 'bg-blue-100 text-blue-700',
  TCC: 'bg-teal-100 text-teal-700',
  'Pós-Doutorado': 'bg-orange-100 text-orange-700',
}

const needsQualificacao = (curso: string) =>
  curso === 'Mestrado' || curso === 'Doutorado'

/* ─── Form type ──────────────────────────────────────────────────────── */

type OrientacaoForm = {
  nome_orientando: string
  curso: string
  titulo_provisorio: string
  ano_ingresso?: number
  previsao_conclusao: string
  exame_qualificacao: boolean
  leituras_str: string
  links_documentos_str: string
}

const emptyForm: OrientacaoForm = {
  nome_orientando: '', curso: 'Mestrado', titulo_provisorio: '',
  ano_ingresso: undefined, previsao_conclusao: '',
  exame_qualificacao: false, leituras_str: '', links_documentos_str: '',
}

/* ─── Component ──────────────────────────────────────────────────────── */

export function Orientacoes() {
  const { isDemoMode } = useAuth()
  const demo = useDemoData()
  const { toasts, toast, dismiss } = useToast()

  const [orientacoes, setOrientacoes] = useState<Orientacao[]>(isDemoMode ? demo.orientacoes : [])
  const [tarefas, setTarefas] = useState<Tarefa[]>(isDemoMode ? demo.tarefas : [])
  const [loading, setLoading] = useState(!isDemoMode)

  // Dialog / form
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Orientacao | null>(null)
  const [form, setForm] = useState<OrientacaoForm>(emptyForm)
  const [pendingProjetoOriginal, setPendingProjetoOriginal] = useState<Anexo | null>(null)
  const [pendingProjetoFile, setPendingProjetoFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Expand/collapse cards
  const [expanded, setExpanded] = useState<string | null>(null)

  // Tarefa inline add
  const [newTarefa, setNewTarefa] = useState('')
  const [activeTarefaId, setActiveTarefaId] = useState<string | null>(null)

  // Reunião inline add
  const [activeReuniaoId, setActiveReuniaoId] = useState<string | null>(null)
  const [novaReuniaoData, setNovaReuniaoData] = useState('')
  const [novaReuniaoTexto, setNovaReuniaoTexto] = useState('')

  useEffect(() => {
    if (isDemoMode) return
    loadOrientacoes().then(({ orientacoes: o, tarefas: t }) => {
      setOrientacoes(o)
      setTarefas(t)
      setLoading(false)
    }).catch(err => { toast({ title: 'Erro ao carregar', description: err.message, variant: 'destructive' }); setLoading(false) })
  }, [isDemoMode])

  /* ── Form open/close ── */

  function openNew() {
    setEditing(null)
    setForm(emptyForm)
    setPendingProjetoOriginal(null)
    setShowForm(true)
  }

  function openEdit(o: Orientacao) {
    setEditing(o)
    setForm({
      nome_orientando: o.nome_orientando,
      curso: o.curso,
      titulo_provisorio: o.titulo_provisorio ?? '',
      ano_ingresso: o.ano_ingresso,
      previsao_conclusao: o.previsao_conclusao ?? '',
      exame_qualificacao: o.exame_qualificacao ?? false,
      leituras_str: (o.leituras ?? []).join('\n'),
      links_documentos_str: (o.links_documentos ?? []).join('\n'),
    })
    setPendingProjetoOriginal(null)
    setPendingProjetoFile(null)
    setShowForm(true)
  }

  /* ── CRUD ── */

  async function handleSave() {
    if (!form.nome_orientando.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' })
      return
    }
    const leituras = form.leituras_str.split('\n').map(s => s.trim()).filter(Boolean)
    const links_documentos = form.links_documentos_str.split('\n').map(s => s.trim()).filter(Boolean)
    const projeto_original = pendingProjetoOriginal ?? editing?.projeto_original ?? undefined

    const payload = {
      nome_orientando: form.nome_orientando,
      curso: form.curso,
      titulo_provisorio: form.titulo_provisorio,
      ano_ingresso: form.ano_ingresso ? Number(form.ano_ingresso) : undefined,
      previsao_conclusao: form.previsao_conclusao,
      exame_qualificacao: form.exame_qualificacao,
      leituras,
      links_documentos,
      projeto_original,
    }

    if (isDemoMode) {
      if (editing) {
        setOrientacoes(prev => prev.map(o =>
          o.id === editing.id ? { ...o, ...payload, updated_at: new Date().toISOString() } : o
        ))
      } else {
        setOrientacoes(prev => [{
          id: Date.now().toString(),
          user_id: 'demo-user-id',
          ...payload,
          reunioes: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Orientacao, ...prev])
      }
      toast({ title: editing ? 'Orientação atualizada' : 'Orientação criada' })
      setPendingProjetoOriginal(null)
      setShowForm(false)
      return
    }

    const now = new Date().toISOString()
    const id = editing ? editing.id : crypto.randomUUID()
    let savedProjetoOriginal: Anexo | undefined = pendingProjetoOriginal ?? editing?.projeto_original ?? undefined
    if (pendingProjetoFile) {
      savedProjetoOriginal = await uploadAnexo('orientacoes', id, pendingProjetoFile)
    }
    const ghOrientacao: Orientacao = {
      id,
      user_id: 'github-user',
      ...payload,
      projeto_original: savedProjetoOriginal,
      reunioes: editing?.reunioes ?? [],
      created_at: editing?.created_at ?? now,
      updated_at: now,
    }
    try {
      await saveOrientacaoFile(ghOrientacao, tarefas)
    } catch (err: any) { toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' }); return }
    setOrientacoes(prev => editing ? prev.map(o => o.id === id ? ghOrientacao : o) : [ghOrientacao, ...prev])
    toast({ title: editing ? 'Orientação atualizada' : 'Orientação criada' })
    setPendingProjetoOriginal(null)
    setPendingProjetoFile(null)
    setShowForm(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover esta orientação?')) return
    if (isDemoMode) {
      setOrientacoes(prev => prev.filter(o => o.id !== id))
      setTarefas(prev => prev.filter(t => t.orientacao_id !== id))
      toast({ title: 'Orientação removida' })
      return
    }
    try {
      await deleteOrientacaoFile(id)
    } catch (err: any) { toast({ title: 'Erro ao remover', variant: 'destructive' }); return }
    setOrientacoes(prev => prev.filter(o => o.id !== id))
    setTarefas(prev => prev.filter(t => t.orientacao_id !== id))
    toast({ title: 'Orientação removida' })
  }

  /* ── Tarefas ── */

  async function addTarefa(orientacaoId: string) {
    if (!newTarefa.trim()) return
    if (isDemoMode) {
      const t: Tarefa = {
        id: Date.now().toString(), user_id: 'demo-user-id',
        orientacao_id: orientacaoId, descricao: newTarefa,
        concluida: false, created_at: new Date().toISOString(),
      }
      setTarefas(prev => [...prev, t])
      setNewTarefa('')
      return
    }
    const t: Tarefa = { id: crypto.randomUUID(), user_id: 'github-user', orientacao_id: orientacaoId, descricao: newTarefa, concluida: false, created_at: new Date().toISOString() }
    const updatedTarefas = [...tarefas, t]
    setTarefas(updatedTarefas)
    const orientacao = orientacoes.find(o => o.id === orientacaoId)!
    await saveOrientacaoFile(orientacao, updatedTarefas).catch(() => {})
    setNewTarefa('')
  }

  async function toggleTarefa(t: Tarefa) {
    if (isDemoMode) {
      setTarefas(prev => prev.map(x => x.id === t.id ? { ...x, concluida: !x.concluida } : x))
      return
    }
    const updatedTarefas = tarefas.map(x => x.id === t.id ? { ...x, concluida: !x.concluida } : x)
    setTarefas(updatedTarefas)
    const orientacao = orientacoes.find(o => o.id === t.orientacao_id)!
    await saveOrientacaoFile(orientacao, updatedTarefas).catch(() => {})
  }

  /* ── Reuniões ── */

  function addReuniao(orientacaoId: string) {
    if (!novaReuniaoTexto.trim()) return
    const entry: NotaReuniao = {
      id: crypto.randomUUID(),
      ...(novaReuniaoData ? { data: novaReuniaoData } : {}),
      texto: novaReuniaoTexto.trim(),
    }
    const updatedOrientacoes = orientacoes.map(o =>
      o.id !== orientacaoId ? o : { ...o, reunioes: [...(o.reunioes ?? []), entry] }
    )
    setOrientacoes(updatedOrientacoes)
    setNovaReuniaoTexto('')
    setNovaReuniaoData('')
    setActiveReuniaoId(null)
    if (!isDemoMode) {
      const updatedO = updatedOrientacoes.find(o => o.id === orientacaoId)!
      saveOrientacaoFile(updatedO, tarefas).catch(() => {})
    }
  }

  function deleteReuniao(orientacaoId: string, reuniaoId: string) {
    const updatedOrientacoes = orientacoes.map(o =>
      o.id !== orientacaoId ? o
        : { ...o, reunioes: (o.reunioes ?? []).filter(r => r.id !== reuniaoId) }
    )
    setOrientacoes(updatedOrientacoes)
    if (!isDemoMode) {
      const updatedO = updatedOrientacoes.find(o => o.id === orientacaoId)!
      saveOrientacaoFile(updatedO, tarefas).catch(() => {})
    }
  }

  /* ── File picker ── */

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingProjetoOriginal({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      url: URL.createObjectURL(file),
      type: file.type,
    })
    setPendingProjetoFile(file)
    e.target.value = ''
  }

  /* ── Grouped list ── */

  const byCurso = CURSOS.filter(c => orientacoes.some(o => o.curso === c))

  /* ─── Render ──────────────────────────────────────────────────────── */

  return (
    <div className="animate-fade-in space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* Hidden file input for projeto original */}
      <input type="file" ref={fileRef} className="hidden" onChange={handleFileSelect} />

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-pink-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Orientações</h1>
            <p className="text-sm text-gray-500">Gestão de orientandos(as) e tarefas</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => exportExcel(orientacoes)}>
            <FileText className="w-4 h-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportPDF(orientacoes)}>
            <FileText className="w-4 h-4" /> PDF
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus className="w-4 h-4" /> Nova Orientação
          </Button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <Card className="sm:col-span-1">
          <CardContent className="pt-5 pb-4">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-3xl font-bold text-gray-900">{orientacoes.length}</p>
          </CardContent>
        </Card>
        {CURSOS.map(c => (
          <Card key={c}>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-gray-500 leading-tight">{c}</p>
              <p className="text-3xl font-bold text-pink-700">
                {orientacoes.filter(o => o.curso === c).length}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── List ── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin" />
        </div>
      ) : orientacoes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-gray-400">
            <GraduationCap className="w-10 h-10 mb-2" />
            <p className="text-sm">Nenhum(a) orientando(a) cadastrado(a)</p>
            <Button variant="ghost" size="sm" className="mt-3" onClick={openNew}>
              Adicionar primeiro(a) orientando(a)
            </Button>
          </CardContent>
        </Card>
      ) : (
        byCurso.map(curso => (
          <div key={curso}>
            <div className="flex items-center gap-2 mb-3">
              <Badge className={`${CURSO_COLORS[curso] ?? 'bg-gray-100 text-gray-700'} border-0`}>
                {curso}
              </Badge>
              <span className="text-sm text-gray-500">
                {orientacoes.filter(o => o.curso === curso).length}
              </span>
            </div>
            <div className="space-y-3">
              {orientacoes.filter(o => o.curso === curso).map(o => {
                const isOpen = expanded === o.id
                const myTarefas = tarefas.filter(t => t.orientacao_id === o.id)
                const pendingTarefas = myTarefas.filter(t => !t.concluida).length
                const reunioes = o.reunioes ?? []
                const sortedReunioes = [...reunioes].sort((a, b) => {
                  if (a.data && b.data) return b.data.localeCompare(a.data)
                  if (a.data) return -1
                  if (b.data) return 1
                  return 0
                })
                const hasLinks = (o.links_documentos ?? []).length > 0
                const hasDocs = hasLinks || !!o.projeto_original

                return (
                  <Card key={o.id} className="hover:shadow-md transition-shadow">
                    {/* Card header */}
                    <div
                      className="flex items-center gap-3 px-6 py-4 cursor-pointer"
                      onClick={() => setExpanded(isOpen ? null : o.id)}
                    >
                      <div className="w-9 h-9 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-pink-700">
                          {o.nome_orientando.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900">{o.nome_orientando}</span>
                          <Badge className={`${CURSO_COLORS[o.curso] ?? 'bg-gray-100 text-gray-700'} border-0 text-xs`}>
                            {o.curso}
                          </Badge>
                          {needsQualificacao(o.curso) && o.exame_qualificacao && (
                            <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">
                              Qualificado(a)
                            </Badge>
                          )}
                        </div>
                        {o.titulo_provisorio && (
                          <p className="text-sm text-gray-500 truncate mt-0.5">{o.titulo_provisorio}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5 flex-wrap">
                          {o.ano_ingresso && <span>Ingresso: {o.ano_ingresso}</span>}
                          {o.previsao_conclusao && <span>Conclusão: {o.previsao_conclusao}</span>}
                          {reunioes.length > 0 && (
                            <span>{reunioes.length} reunião(ões)</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {pendingTarefas > 0 && (
                          <Badge variant="warning">
                            {pendingTarefas} pendente{pendingTarefas !== 1 ? 's' : ''}
                          </Badge>
                        )}
                        <Button
                          variant="ghost" size="icon"
                          onClick={e => { e.stopPropagation(); openEdit(o) }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          onClick={e => { e.stopPropagation(); handleDelete(o.id) }}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </Button>
                        {isOpen
                          ? <ChevronUp className="w-4 h-4 text-gray-400" />
                          : <ChevronDown className="w-4 h-4 text-gray-400" />
                        }
                      </div>
                    </div>

                    {/* Expanded tabs */}
                    {isOpen && (
                      <div className="border-t border-gray-100 px-6 py-4">
                        <Tabs defaultValue="tarefas">
                          <TabsList className="mb-4">
                            <TabsTrigger value="tarefas">Tarefas ({myTarefas.length})</TabsTrigger>
                            <TabsTrigger value="reunioes">Reuniões ({reunioes.length})</TabsTrigger>
                            {(o.leituras ?? []).length > 0 && (
                              <TabsTrigger value="leituras">
                                Leituras ({(o.leituras ?? []).length})
                              </TabsTrigger>
                            )}
                            {hasDocs && (
                              <TabsTrigger value="documentos">Documentos</TabsTrigger>
                            )}
                          </TabsList>

                          {/* ── Tarefas tab ── */}
                          <TabsContent value="tarefas">
                            <div className="space-y-2 mb-3">
                              {myTarefas.map(t => (
                                <div
                                  key={t.id}
                                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50"
                                >
                                  <Checkbox
                                    checked={t.concluida}
                                    onCheckedChange={() => toggleTarefa(t)}
                                  />
                                  <span className={`text-sm ${t.concluida ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                    {t.descricao}
                                  </span>
                                </div>
                              ))}
                              {myTarefas.length === 0 && (
                                <p className="text-sm text-gray-400 text-center py-2">
                                  Nenhuma tarefa cadastrada
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                              <Input
                                value={activeTarefaId === o.id ? newTarefa : ''}
                                onChange={e => { setActiveTarefaId(o.id); setNewTarefa(e.target.value) }}
                                onKeyDown={e => { if (e.key === 'Enter') addTarefa(o.id) }}
                                placeholder="Nova tarefa (Enter para adicionar)"
                                className="flex-1"
                              />
                              <Button
                                size="sm" variant="outline"
                                onClick={() => { setActiveTarefaId(o.id); addTarefa(o.id) }}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                          </TabsContent>

                          {/* ── Reuniões tab ── */}
                          <TabsContent value="reunioes">
                            {/* Toolbar */}
                            <div className="flex justify-end mb-3">
                              <Button
                                variant="outline" size="sm"
                                onClick={() => downloadNotasMarkdown(o)}
                                disabled={reunioes.length === 0}
                              >
                                <Download className="w-3.5 h-3.5" /> Baixar Markdown
                              </Button>
                            </div>

                            {/* Entry list — timeline */}
                            <div className="space-y-0 mb-4">
                              {sortedReunioes.length === 0 && (
                                <p className="text-sm text-gray-400 text-center py-4">
                                  Nenhuma anotação registrada
                                </p>
                              )}
                              {sortedReunioes.map((r, idx) => (
                                <div key={r.id} className="flex gap-3 group">
                                  {/* Timeline dot + line */}
                                  <div className="flex flex-col items-center pt-1.5 flex-shrink-0">
                                    <div className="w-2 h-2 rounded-full bg-pink-400 flex-shrink-0" />
                                    {idx < sortedReunioes.length - 1 && (
                                      <div className="w-px flex-1 bg-gray-200 my-1" style={{ minHeight: 24 }} />
                                    )}
                                  </div>
                                  {/* Content */}
                                  <div className="flex-1 pb-4">
                                    {r.data ? (
                                      <div className="flex items-center gap-1.5 mb-1">
                                        <CalendarDays className="w-3 h-3 text-gray-400" />
                                        <span className="text-xs font-medium text-gray-500">{r.data}</span>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-gray-400 italic mb-1 block">
                                        Sem data
                                      </span>
                                    )}
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.texto}</p>
                                  </div>
                                  {/* Delete */}
                                  <button
                                    onClick={() => deleteReuniao(o.id, r.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-300 hover:text-red-500 flex-shrink-0 mt-0.5"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>

                            {/* Add entry form */}
                            <div
                              className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50"
                              onClick={e => e.stopPropagation()}
                            >
                              <div className="flex items-center gap-2">
                                <CalendarDays className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                <Input
                                  type="date"
                                  value={activeReuniaoId === o.id ? novaReuniaoData : ''}
                                  onChange={e => {
                                    setActiveReuniaoId(o.id)
                                    setNovaReuniaoData(e.target.value)
                                  }}
                                  className="h-7 text-xs w-40"
                                />
                                <span className="text-xs text-gray-400">data opcional</span>
                              </div>
                              <Textarea
                                value={activeReuniaoId === o.id ? novaReuniaoTexto : ''}
                                onChange={e => {
                                  setActiveReuniaoId(o.id)
                                  setNovaReuniaoTexto(e.target.value)
                                }}
                                placeholder="Anotação da reunião..."
                                rows={2}
                                className="text-sm"
                              />
                              <div className="flex justify-end">
                                <Button
                                  size="sm" variant="outline"
                                  onClick={() => {
                                    setActiveReuniaoId(o.id)
                                    addReuniao(o.id)
                                  }}
                                  disabled={
                                    !(activeReuniaoId === o.id && novaReuniaoTexto.trim())
                                  }
                                >
                                  <Plus className="w-3.5 h-3.5" /> Adicionar
                                </Button>
                              </div>
                            </div>
                          </TabsContent>

                          {/* ── Leituras tab ── */}
                          {(o.leituras ?? []).length > 0 && (
                            <TabsContent value="leituras">
                              <div className="space-y-1.5">
                                {(o.leituras ?? []).map((l, i) => (
                                  <div
                                    key={i}
                                    className="flex items-start gap-2 p-2 rounded-lg bg-gray-50"
                                  >
                                    <BookOpen className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <span className="text-sm text-gray-700">{l}</span>
                                  </div>
                                ))}
                              </div>
                            </TabsContent>
                          )}

                          {/* ── Documentos tab ── */}
                          {hasDocs && (
                            <TabsContent value="documentos">
                              <div className="space-y-4">
                                {o.projeto_original && (
                                  <div>
                                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                                      Projeto Original
                                    </p>
                                    <a
                                      href={o.projeto_original.url}
                                      download={o.projeto_original.name}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group"
                                    >
                                      <Paperclip className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-700 truncate">
                                          {o.projeto_original.name}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                          {formatFileSize(o.projeto_original.size)}
                                        </p>
                                      </div>
                                      <Download className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />
                                    </a>
                                  </div>
                                )}
                                {hasLinks && (
                                  <div>
                                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                                      Links de Documentos
                                    </p>
                                    <div className="space-y-1.5">
                                      {(o.links_documentos ?? []).map((link, i) => (
                                        <a
                                          key={i}
                                          href={link}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                                        >
                                          <Link2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                                          <span className="text-sm text-blue-600 truncate hover:underline">
                                            {link}
                                          </span>
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </TabsContent>
                          )}
                        </Tabs>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          </div>
        ))
      )}

      {/* ── Form Dialog ── */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Editar Orientação' : 'Nova Orientação'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              {/* Nome — full width */}
              <div className="col-span-2 space-y-1.5">
                <Label>Nome do(a) Orientando(a) *</Label>
                <Input
                  value={form.nome_orientando}
                  onChange={e => setForm(f => ({ ...f, nome_orientando: e.target.value }))}
                  placeholder="Nome completo"
                />
              </div>

              {/* Curso */}
              <div className="space-y-1.5">
                <Label>Curso *</Label>
                <select
                  value={form.curso}
                  onChange={e => setForm(f => ({
                    ...f, curso: e.target.value, exame_qualificacao: false,
                  }))}
                  className="flex h-9 w-full rounded-md border border-gray-200 bg-white px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {CURSOS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Título Provisório */}
              <div className="space-y-1.5">
                <Label>Título Provisório</Label>
                <Input
                  value={form.titulo_provisorio}
                  onChange={e => setForm(f => ({ ...f, titulo_provisorio: e.target.value }))}
                  placeholder="Título da dissertação/tese"
                />
              </div>

              {/* Ano de Ingresso + Previsão de Conclusão — side by side */}
              <div className="space-y-1.5">
                <Label>Ano de Ingresso</Label>
                <Input
                  type="number"
                  value={form.ano_ingresso ?? ''}
                  onChange={e => setForm(f => ({
                    ...f, ano_ingresso: e.target.value ? Number(e.target.value) : undefined,
                  }))}
                  placeholder="2023"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Previsão de Conclusão</Label>
                <Input
                  value={form.previsao_conclusao}
                  onChange={e => setForm(f => ({ ...f, previsao_conclusao: e.target.value }))}
                  placeholder="Ex: 2025/1"
                />
              </div>

              {/* Projeto Original */}
              <div className="col-span-2 space-y-1.5">
                <Label>Projeto Original</Label>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    type="button" variant="outline" size="sm"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Paperclip className="w-4 h-4" /> Anexar Arquivo
                  </Button>
                  {pendingProjetoOriginal && (
                    <span className="flex items-center gap-1.5 text-sm text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg">
                      <FileText className="w-3.5 h-3.5 text-gray-500" />
                      {pendingProjetoOriginal.name}
                      <span className="text-xs text-gray-400 ml-0.5">
                        ({formatFileSize(pendingProjetoOriginal.size)})
                      </span>
                      <button
                        type="button"
                        onClick={() => setPendingProjetoOriginal(null)}
                        className="ml-1 text-gray-400 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {!pendingProjetoOriginal && editing?.projeto_original && (
                    <span className="text-sm text-gray-500 italic">
                      Atual: {editing.projeto_original.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Exame de Qualificação — Mestrado/Doutorado only */}
              {needsQualificacao(form.curso) && (
                <div className="col-span-2 flex items-center gap-2.5">
                  <Checkbox
                    id="exame-qualificacao"
                    checked={form.exame_qualificacao}
                    onCheckedChange={v => setForm(f => ({
                      ...f, exame_qualificacao: Boolean(v),
                    }))}
                  />
                  <Label htmlFor="exame-qualificacao" className="cursor-pointer font-normal">
                    Exame de Qualificação realizado
                  </Label>
                </div>
              )}
            </div>

            {/* Leituras */}
            <div className="space-y-1.5">
              <Label>Leituras Indicadas (uma por linha)</Label>
              <Textarea
                value={form.leituras_str}
                onChange={e => setForm(f => ({ ...f, leituras_str: e.target.value }))}
                placeholder="Ex: Breiman, L. (2001). Random Forests"
                rows={3}
              />
            </div>

            {/* Links de Documentos */}
            <div className="space-y-1.5">
              <Label>Links de Documentos (um por linha)</Label>
              <Textarea
                value={form.links_documentos_str}
                onChange={e => setForm(f => ({ ...f, links_documentos_str: e.target.value }))}
                placeholder="https://drive.google.com/..."
                rows={2}
              />
            </div>

          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? 'Salvar' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
