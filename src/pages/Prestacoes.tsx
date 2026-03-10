import { useState, useEffect, useRef } from 'react'
import { Plus, Receipt, Pencil, Trash2, ChevronDown, ChevronUp, FileText, DollarSign, Paperclip, Download } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useDemoData } from '@/hooks/useDemoData'
import { useToast } from '@/hooks/useToast'
import { loadPrestacoes, savePrestacaoFile, deletePrestacaoFile, uploadAnexo } from '@/lib/githubStorage'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ToastContainer } from '@/components/ui/toast'
import type { Prestacao, Despesa, Anexo } from '@/types'

// Export helpers
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function exportPDF(prestacoes: Prestacao[]) {
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text('Prestações de Contas', 14, 22)
  doc.setFontSize(10)
  doc.text(`Exportado em ${new Date().toLocaleDateString('pt-BR')}`, 14, 30)
  autoTable(doc, {
    startY: 36,
    head: [['Título', 'Agência', 'Vigência', 'Total Recursos']],
    body: prestacoes.map(p => [
      p.titulo,
      p.agencia_fomento ?? '—',
      p.vigencia_inicio ? `${formatDate(p.vigencia_inicio)} – ${formatDate(p.vigencia_fim ?? null)}` : '—',
      p.total_recursos != null ? formatCurrency(p.total_recursos) : '—',
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [37, 99, 235] },
  })
  doc.save('prestacoes.pdf')
}

function exportExcel(prestacoes: Prestacao[]) {
  const ws = XLSX.utils.json_to_sheet(prestacoes.map(p => ({
    Título: p.titulo,
    'Nº Processo': p.numero_processo ?? '',
    Edital: p.nome_edital ?? '',
    Agência: p.agencia_fomento ?? '',
    'Vigência Início': p.vigencia_inicio ?? '',
    'Vigência Fim': p.vigencia_fim ?? '',
    'Total Recursos': p.total_recursos ?? '',
  })))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Prestações')
  XLSX.writeFile(wb, 'prestacoes.xlsx')
}

const emptyPrestacao: Omit<Prestacao, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  titulo: '', numero_processo: '', numero_edital: '', nome_edital: '',
  agencia_fomento: '', vigencia_inicio: '', vigencia_fim: '', total_recursos: undefined,
}

const emptyDespesa: Omit<Despesa, 'id' | 'user_id' | 'prestacao_id' | 'created_at'> = {
  descricao: '', data: '', valor: 0, numero_nota_fiscal: '', prestador_servico: '',
}

export function Prestacoes() {
  const { isDemoMode } = useAuth()
  const demo = useDemoData()
  const { toasts, toast, dismiss } = useToast()

  const [prestacoes, setPrestacoes] = useState<Prestacao[]>(isDemoMode ? demo.prestacoes : [])
  const [despesas, setDespesas] = useState<Despesa[]>(isDemoMode ? demo.despesas : [])
  const [loading, setLoading] = useState(!isDemoMode)
  const [expanded, setExpanded] = useState<string | null>(null)

  // Prestação form state
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Prestacao | null>(null)
  const [form, setForm] = useState(emptyPrestacao)

  // Despesa form state
  const [showDespesaForm, setShowDespesaForm] = useState(false)
  const [despesaForm, setDespesaForm] = useState(emptyDespesa)
  const [currentPrestacaoId, setCurrentPrestacaoId] = useState<string | null>(null)

  // File attachment state — Maps keyed by entity id
  const [prestacaoAnexos, setPrestacaoAnexos] = useState<Map<string, Anexo[]>>(new Map())
  const [despesaAnexos, setDespesaAnexos] = useState<Map<string, Anexo[]>>(new Map())

  // Pending attachments while form is open
  const [pendingAnexo, setPendingAnexo] = useState<Anexo | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingDespesaAnexos, setPendingDespesaAnexos] = useState<Anexo[]>([])
  const [pendingDespesaFiles, setPendingDespesaFiles] = useState<File[]>([])

  // Despesa panel — track which despesa's file list is expanded
  const [expandedDespesaFiles, setExpandedDespesaFiles] = useState<string | null>(null)

  const prestacaoFileRef = useRef<HTMLInputElement>(null)
  const despesaFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isDemoMode) return
    loadPrestacoes().then(({ prestacoes: p, despesas: d }) => {
      setPrestacoes(p)
      setDespesas(d)
      const pMap = new Map<string, Anexo[]>()
      p.forEach(pr => { if (pr.anexos?.length) pMap.set(pr.id, pr.anexos) })
      setPrestacaoAnexos(pMap)
      const dMap = new Map<string, Anexo[]>()
      d.forEach(de => { if (de.anexos?.length) dMap.set(de.id, de.anexos) })
      setDespesaAnexos(dMap)
      setLoading(false)
    }).catch(err => {
      toast({ title: 'Erro ao carregar', description: err.message, variant: 'destructive' })
      setLoading(false)
    })
  }, [isDemoMode])

  const totalRecursos = prestacoes.reduce((s, p) => s + (p.total_recursos ?? 0), 0)
  const totalDespesas = despesas.reduce((s, d) => s + d.valor, 0)

  // --- Prestação CRUD ---

  function openNew() {
    setEditing(null)
    setForm(emptyPrestacao)
    setPendingAnexo(null)
    setPendingFile(null)
    setShowForm(true)
  }

  function openEdit(p: Prestacao) {
    setEditing(p)
    setForm({
      titulo: p.titulo,
      numero_processo: p.numero_processo ?? '',
      numero_edital: p.numero_edital ?? '',
      nome_edital: p.nome_edital ?? '',
      agencia_fomento: p.agencia_fomento ?? '',
      vigencia_inicio: p.vigencia_inicio ?? '',
      vigencia_fim: p.vigencia_fim ?? '',
      total_recursos: p.total_recursos,
    })
    // Show existing attachment as pending so the user can see/replace it
    const existing = prestacaoAnexos.get(p.id)
    setPendingAnexo(existing?.[0] ?? null)
    setPendingFile(null)
    setShowForm(true)
  }

  function handlePrestacaoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    const anexo: Anexo = { id: crypto.randomUUID(), name: file.name, size: file.size, url, type: file.type }
    setPendingAnexo(anexo)
    setPendingFile(file)
    // reset input so same file can be re-selected
    e.target.value = ''
  }

  async function handleSave() {
    if (!form.titulo.trim()) { toast({ title: 'Título obrigatório', variant: 'destructive' }); return }

    let savedId: string | null = null

    if (isDemoMode) {
      if (editing) {
        setPrestacoes(prev => prev.map(p => p.id === editing.id ? { ...p, ...form, updated_at: new Date().toISOString() } : p))
        savedId = editing.id
      } else {
        const newP: Prestacao = { id: crypto.randomUUID(), user_id: 'demo-user-id', ...form, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        setPrestacoes(prev => [newP, ...prev])
        savedId = newP.id
      }
      if (savedId && pendingAnexo) {
        setPrestacaoAnexos(prev => { const next = new Map(prev); next.set(savedId!, [pendingAnexo]); return next })
      }
    } else {
      const now = new Date().toISOString()
      const id = editing ? editing.id : crypto.randomUUID()
      let savedAnexo: Anexo | undefined = pendingAnexo ?? undefined
      if (pendingFile) {
        savedAnexo = await uploadAnexo('prestacoes', id, pendingFile)
      }
      const prestacao: Prestacao = {
        id,
        user_id: 'github-user',
        ...form,
        total_recursos: form.total_recursos ? Number(form.total_recursos) : undefined,
        anexos: savedAnexo ? [savedAnexo] : [],
        created_at: editing?.created_at ?? now,
        updated_at: now,
      }
      try {
        await savePrestacaoFile(prestacao, despesas)
      } catch (err: any) {
        toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' }); return
      }
      setPrestacoes(prev => editing ? prev.map(p => p.id === id ? prestacao : p) : [prestacao, ...prev])
      if (savedAnexo) {
        setPrestacaoAnexos(prev => { const next = new Map(prev); next.set(id, [savedAnexo!]); return next })
      }
      savedId = id
    }

    toast({ title: editing ? 'Prestação atualizada' : 'Prestação criada' })
    setShowForm(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover esta prestação?')) return
    if (isDemoMode) {
      setPrestacoes(prev => prev.filter(p => p.id !== id))
      setDespesas(prev => prev.filter(d => d.prestacao_id !== id))
      toast({ title: 'Prestação removida' })
      return
    }
    try {
      await deletePrestacaoFile(id)
    } catch (err: any) {
      toast({ title: 'Erro ao remover', variant: 'destructive' }); return
    }
    setPrestacoes(prev => prev.filter(p => p.id !== id))
    setDespesas(prev => prev.filter(d => d.prestacao_id !== id))
    toast({ title: 'Prestação removida' })
  }

  // --- Despesa CRUD ---

  function handleDespesaFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    const newAnexos: Anexo[] = files.map(file => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      url: URL.createObjectURL(file),
      type: file.type,
    }))
    setPendingDespesaAnexos(prev => [...prev, ...newAnexos])
    setPendingDespesaFiles(prev => [...prev, ...files])
    e.target.value = ''
  }

  async function handleSaveDespesa() {
    if (!despesaForm.descricao.trim()) { toast({ title: 'Descrição obrigatória', variant: 'destructive' }); return }

    if (isDemoMode) {
      const nd: Despesa = { id: crypto.randomUUID(), user_id: 'demo-user-id', prestacao_id: currentPrestacaoId!, ...despesaForm, valor: Number(despesaForm.valor), created_at: new Date().toISOString() }
      setDespesas(prev => [...prev, nd])
      if (pendingDespesaAnexos.length > 0) {
        setDespesaAnexos(prev => { const next = new Map(prev); next.set(nd.id, pendingDespesaAnexos); return next })
      }
    } else {
      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      let uploadedAnexos: Anexo[] = []
      if (pendingDespesaFiles.length > 0) {
        uploadedAnexos = await Promise.all(pendingDespesaFiles.map(f => uploadAnexo('despesas', id, f)))
      }
      const nd: Despesa = { id, user_id: 'github-user', prestacao_id: currentPrestacaoId!, ...despesaForm, valor: Number(despesaForm.valor), anexos: uploadedAnexos, created_at: now }
      const updatedDespesas = [...despesas, nd]
      const parentPrestacao = prestacoes.find(p => p.id === currentPrestacaoId!)!
      try {
        await savePrestacaoFile(parentPrestacao, updatedDespesas)
      } catch (err: any) {
        toast({ title: 'Erro ao salvar despesa', description: err.message, variant: 'destructive' }); return
      }
      setDespesas(updatedDespesas)
      if (uploadedAnexos.length > 0) {
        setDespesaAnexos(prev => { const next = new Map(prev); next.set(id, uploadedAnexos); return next })
      }
    }

    toast({ title: 'Despesa adicionada' })
    setShowDespesaForm(false)
    setDespesaForm(emptyDespesa)
    setPendingDespesaAnexos([])
  }

  return (
    <div className="animate-fade-in space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* Hidden file inputs */}
      <input
        ref={prestacaoFileRef}
        type="file"
        className="hidden"
        accept="application/pdf,image/*,.doc,.docx"
        onChange={handlePrestacaoFileChange}
      />
      <input
        ref={despesaFileRef}
        type="file"
        className="hidden"
        accept="application/pdf,image/*,.doc,.docx"
        multiple
        onChange={handleDespesaFileChange}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Prestações de Contas</h1>
            <p className="text-sm text-gray-500">Gerenciamento de projetos financiados</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => exportExcel(prestacoes)}>
            <FileText className="w-4 h-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportPDF(prestacoes)}>
            <FileText className="w-4 h-4" /> PDF
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus className="w-4 h-4" /> Nova Prestação
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Prestações</p>
                <p className="text-2xl font-bold text-gray-900">{prestacoes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Recursos</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRecursos)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Despesas</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalDespesas)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Prestações Cadastradas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : prestacoes.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-gray-400">
              <Receipt className="w-10 h-10 mb-2" />
              <p className="text-sm">Nenhuma prestação cadastrada</p>
              <Button variant="ghost" size="sm" className="mt-3" onClick={openNew}>Adicionar primeira prestação</Button>
            </div>
          ) : (
            <div>
              {prestacoes.map(p => {
                const isOpen = expanded === p.id
                const myDespesas = despesas.filter(d => d.prestacao_id === p.id)
                const editalAnexo = prestacaoAnexos.get(p.id)?.[0] ?? null
                return (
                  <div key={p.id} className="border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3 px-6 py-4 hover:bg-gray-50 cursor-pointer" onClick={() => setExpanded(isOpen ? null : p.id)}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 truncate">{p.titulo}</span>
                          {p.agencia_fomento && <Badge variant="secondary">{p.agencia_fomento}</Badge>}
                          {editalAnexo && (
                            <a
                              href={editalAnexo.url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                              title={editalAnexo.name}
                            >
                              <Paperclip className="w-3 h-3" />
                              <span className="truncate max-w-[120px]">{editalAnexo.name}</span>
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                          {p.numero_processo && <span>Proc.: {p.numero_processo}</span>}
                          {p.vigencia_inicio && <span>{formatDate(p.vigencia_inicio)} – {formatDate(p.vigencia_fim ?? null)}</span>}
                          {p.total_recursos != null && <span className="font-medium text-green-700">{formatCurrency(p.total_recursos)}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline">{myDespesas.length} despesa{myDespesas.length !== 1 ? 's' : ''}</Badge>
                        <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); openEdit(p) }} title="Editar">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); handleDelete(p.id) }} title="Excluir">
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </Button>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </div>

                    {isOpen && (
                      <div className="px-6 pb-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold text-gray-700">Despesas</h3>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCurrentPrestacaoId(p.id)
                              setDespesaForm(emptyDespesa)
                              setPendingDespesaAnexos([])
                              setShowDespesaForm(true)
                            }}
                          >
                            <Plus className="w-3.5 h-3.5" /> Nova Despesa
                          </Button>
                        </div>
                        {myDespesas.length === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-4">Nenhuma despesa registrada</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Descrição</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead>Prestador</TableHead>
                                <TableHead>NF</TableHead>
                                <TableHead>Anexos</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {myDespesas.map(d => {
                                const dAnexos = despesaAnexos.get(d.id) ?? []
                                const isFilesOpen = expandedDespesaFiles === d.id
                                return (
                                  <>
                                    <TableRow key={d.id}>
                                      <TableCell className="font-medium">{d.descricao}</TableCell>
                                      <TableCell>{formatDate(d.data)}</TableCell>
                                      <TableCell>{d.prestador_servico ?? '—'}</TableCell>
                                      <TableCell>{d.numero_nota_fiscal ?? '—'}</TableCell>
                                      <TableCell>
                                        {dAnexos.length > 0 ? (
                                          <button
                                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                                            onClick={() => setExpandedDespesaFiles(isFilesOpen ? null : d.id)}
                                          >
                                            <Paperclip className="w-3 h-3" />
                                            <Badge variant="secondary" className="text-xs px-1.5 py-0">{dAnexos.length}</Badge>
                                          </button>
                                        ) : (
                                          <span className="text-xs text-gray-400">—</span>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-right font-medium text-green-700">{formatCurrency(d.valor)}</TableCell>
                                    </TableRow>
                                    {isFilesOpen && dAnexos.length > 0 && (
                                      <TableRow key={`${d.id}-files`}>
                                        <TableCell colSpan={6} className="bg-blue-50 py-2 px-4">
                                          <div className="flex flex-col gap-1">
                                            {dAnexos.map(a => (
                                              <a
                                                key={a.id}
                                                href={a.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                download={a.name}
                                                className="inline-flex items-center gap-2 text-xs text-blue-700 hover:underline"
                                              >
                                                <Download className="w-3 h-3 flex-shrink-0" />
                                                <span>{a.name}</span>
                                                <span className="text-gray-400">({formatFileSize(a.size)})</span>
                                              </a>
                                            ))}
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </>
                                )
                              })}
                              <TableRow>
                                <TableCell colSpan={5} className="font-semibold text-right text-gray-700">Total:</TableCell>
                                <TableCell className="text-right font-bold text-green-700">{formatCurrency(myDespesas.reduce((s, d) => s + d.valor, 0))}</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prestação form dialog */}
      <Dialog open={showForm} onOpenChange={open => { setShowForm(open); if (!open) { setPendingAnexo(null); setPendingFile(null) } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Prestação' : 'Nova Prestação de Contas'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Título *</Label>
              <Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Título da prestação" />
            </div>
            <div className="space-y-1.5">
              <Label>Nº do Processo</Label>
              <Input value={form.numero_processo} onChange={e => setForm(f => ({ ...f, numero_processo: e.target.value }))} placeholder="Ex: 403212/2023-1" />
            </div>
            <div className="space-y-1.5">
              <Label>Agência de Fomento</Label>
              <Input value={form.agencia_fomento} onChange={e => setForm(f => ({ ...f, agencia_fomento: e.target.value }))} placeholder="Ex: CNPq, FAPERJ, CAPES" />
            </div>
            <div className="space-y-1.5">
              <Label>Nº do Edital</Label>
              <Input value={form.numero_edital} onChange={e => setForm(f => ({ ...f, numero_edital: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Nome do Edital</Label>
              <Input value={form.nome_edital} onChange={e => setForm(f => ({ ...f, nome_edital: e.target.value }))} placeholder="Ex: Edital Universal" />
            </div>
            <div className="space-y-1.5">
              <Label>Vigência Início</Label>
              <Input type="date" value={form.vigencia_inicio} onChange={e => setForm(f => ({ ...f, vigencia_inicio: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Vigência Fim</Label>
              <Input type="date" value={form.vigencia_fim} onChange={e => setForm(f => ({ ...f, vigencia_fim: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Total de Recursos (R$)</Label>
              <Input type="number" value={form.total_recursos ?? ''} onChange={e => setForm(f => ({ ...f, total_recursos: e.target.value ? Number(e.target.value) : undefined }))} placeholder="0,00" />
            </div>

            {/* Edital attachment */}
            <div className="sm:col-span-2 space-y-1.5 pt-2 border-t border-gray-100">
              <Label>Documento do Edital</Label>
              {pendingAnexo ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <Paperclip className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-blue-800 truncate">{pendingAnexo.name}</p>
                    <p className="text-xs text-blue-500">{formatFileSize(pendingAnexo.size)}</p>
                  </div>
                  <div className="flex gap-1">
                    <a href={pendingAnexo.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800">
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      className="text-red-400 hover:text-red-600 ml-1"
                      onClick={() => setPendingAnexo(null)}
                      title="Remover arquivo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => prestacaoFileRef.current?.click()}
                  >
                    <Paperclip className="w-4 h-4" /> Anexar Edital
                  </Button>
                  <span className="text-xs text-gray-400">PDF, imagem, DOC — sem arquivo anexado</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? 'Salvar' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Despesa form dialog */}
      <Dialog open={showDespesaForm} onOpenChange={open => { setShowDespesaForm(open); if (!open) { setPendingDespesaAnexos([]); setPendingDespesaFiles([]) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Despesa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Descrição *</Label>
              <Input value={despesaForm.descricao} onChange={e => setDespesaForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descrição da despesa" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Data</Label>
                <Input type="date" value={despesaForm.data} onChange={e => setDespesaForm(f => ({ ...f, data: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Valor (R$)</Label>
                <Input type="number" value={despesaForm.valor || ''} onChange={e => setDespesaForm(f => ({ ...f, valor: Number(e.target.value) }))} placeholder="0,00" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Prestador de Serviço</Label>
              <Input value={despesaForm.prestador_servico} onChange={e => setDespesaForm(f => ({ ...f, prestador_servico: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Nº da Nota Fiscal</Label>
              <Input value={despesaForm.numero_nota_fiscal} onChange={e => setDespesaForm(f => ({ ...f, numero_nota_fiscal: e.target.value }))} />
            </div>

            {/* Despesa attachment section */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <Label>Anexar Documentos</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => despesaFileRef.current?.click()}
                >
                  <Paperclip className="w-4 h-4" /> Adicionar Arquivos
                </Button>
                <span className="text-xs text-gray-400">PDF, imagem, DOC (múltiplos)</span>
              </div>
              {pendingDespesaAnexos.length > 0 && (
                <div className="space-y-1.5 mt-2">
                  {pendingDespesaAnexos.map((a, i) => (
                    <div key={a.id} className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 border border-blue-100">
                      <Paperclip className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-blue-800 truncate">{a.name}</p>
                        <p className="text-xs text-blue-400">{formatFileSize(a.size)}</p>
                      </div>
                      <button
                        className="text-red-400 hover:text-red-600"
                        onClick={() => { setPendingDespesaAnexos(prev => prev.filter((_, idx) => idx !== i)); setPendingDespesaFiles(prev => prev.filter((_, idx) => idx !== i)) }}
                        title="Remover"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDespesaForm(false)}>Cancelar</Button>
            <Button onClick={handleSaveDespesa}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
