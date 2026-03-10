import { useState, useEffect } from 'react'
import { Plus, FolderKanban, Pencil, Trash2, FileText, Users, DollarSign, Calendar } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useDemoData } from '@/hooks/useDemoData'
import { useToast } from '@/hooks/useToast'
import { loadProjetos, saveProjeto, deleteProjeto } from '@/lib/githubStorage'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ToastContainer } from '@/components/ui/toast'
import type { ProjetoFinanciado } from '@/types'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function exportPDF(projetos: ProjetoFinanciado[]) {
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text('Projetos Financiados', 14, 22)
  autoTable(doc, {
    startY: 30,
    head: [['Nome do Projeto', 'Financiadores', 'Vigência', 'Total Aportes', 'Instituições']],
    body: projetos.map(p => [
      p.nome_projeto,
      p.financiadores ?? '—',
      p.vigencia_inicio ? `${formatDate(p.vigencia_inicio)} – ${formatDate(p.vigencia_fim ?? null)}` : '—',
      p.total_aportes != null ? formatCurrency(p.total_aportes) : '—',
      p.instituicoes_envolvidas ?? '—',
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [202, 138, 4] },
  })
  doc.save('projetos.pdf')
}

function exportExcel(projetos: ProjetoFinanciado[]) {
  const ws = XLSX.utils.json_to_sheet(projetos.map(p => ({
    'Nome do Projeto': p.nome_projeto,
    'Nº Processo': p.numero_processo ?? '',
    'Chamadas/Editais': p.chamadas_editais ?? '',
    'Financiadores': p.financiadores ?? '',
    'Docentes': (p.docentes_envolvidos ?? []).join('; '),
    'Total Aportes': p.total_aportes ?? '',
    'Vigência Início': p.vigencia_inicio ?? '',
    'Vigência Fim': p.vigencia_fim ?? '',
    'Resumo do Projeto': p.resumo_projeto ?? '',
    'Instituições Envolvidas': p.instituicoes_envolvidas ?? '',
  })))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Projetos')
  XLSX.writeFile(wb, 'projetos.xlsx')
}

type ProjetoForm = Omit<ProjetoFinanciado, 'id' | 'user_id' | 'created_at'> & {
  docentes_str: string
}

const emptyForm: ProjetoForm = {
  nome_projeto: '',
  numero_processo: '',
  chamadas_editais: '',
  financiadores: '',
  docentes_envolvidos: [],
  docentes_str: '',
  total_aportes: undefined,
  vigencia_inicio: '',
  vigencia_fim: '',
  resumo_projeto: '',
  instituicoes_envolvidas: '',
}

export function Projetos() {
  const { isDemoMode } = useAuth()
  const demo = useDemoData()
  const { toasts, toast, dismiss } = useToast()

  const [projetos, setProjetos] = useState<ProjetoFinanciado[]>(isDemoMode ? demo.projetos : [])
  const [loading, setLoading] = useState(!isDemoMode)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ProjetoFinanciado | null>(null)
  const [form, setForm] = useState<ProjetoForm>(emptyForm)

  useEffect(() => {
    if (isDemoMode) return
    loadProjetos().then(data => { setProjetos(data); setLoading(false) })
      .catch(err => { toast({ title: 'Erro ao carregar', description: err.message, variant: 'destructive' }); setLoading(false) })
  }, [isDemoMode])

  const totalAportes = projetos.reduce((s, p) => s + (p.total_aportes ?? 0), 0)

  function openNew() { setEditing(null); setForm(emptyForm); setShowForm(true) }
  function openEdit(p: ProjetoFinanciado) {
    setEditing(p)
    setForm({
      nome_projeto: p.nome_projeto,
      numero_processo: p.numero_processo ?? '',
      chamadas_editais: p.chamadas_editais ?? '',
      financiadores: p.financiadores ?? '',
      docentes_envolvidos: p.docentes_envolvidos ?? [],
      docentes_str: (p.docentes_envolvidos ?? []).join('; '),
      total_aportes: p.total_aportes,
      vigencia_inicio: p.vigencia_inicio ?? '',
      vigencia_fim: p.vigencia_fim ?? '',
      resumo_projeto: p.resumo_projeto ?? '',
      instituicoes_envolvidas: p.instituicoes_envolvidas ?? '',
    })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.nome_projeto.trim()) { toast({ title: 'Nome do projeto obrigatório', variant: 'destructive' }); return }
    const docentes = form.docentes_str.split(';').map(s => s.trim()).filter(Boolean)
    const payload = {
      nome_projeto: form.nome_projeto,
      numero_processo: form.numero_processo,
      chamadas_editais: form.chamadas_editais,
      financiadores: form.financiadores,
      docentes_envolvidos: docentes,
      total_aportes: form.total_aportes ? Number(form.total_aportes) : undefined,
      vigencia_inicio: form.vigencia_inicio,
      vigencia_fim: form.vigencia_fim,
      resumo_projeto: form.resumo_projeto,
      instituicoes_envolvidas: form.instituicoes_envolvidas,
    }
    if (isDemoMode) {
      if (editing) {
        setProjetos(prev => prev.map(p => p.id === editing.id ? { ...p, ...payload } : p))
      } else {
        setProjetos(prev => [{
          id: Date.now().toString(),
          user_id: 'demo-user-id',
          ...payload,
          created_at: new Date().toISOString(),
        } as ProjetoFinanciado, ...prev])
      }
      toast({ title: editing ? 'Projeto atualizado' : 'Projeto criado' })
      setShowForm(false)
      return
    }
    const id = editing ? editing.id : crypto.randomUUID()
    const ghProjeto: ProjetoFinanciado = { ...payload, id, user_id: 'github-user', created_at: editing?.created_at ?? new Date().toISOString() }
    try {
      await saveProjeto(ghProjeto)
    } catch (err: any) { toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' }); return }
    setProjetos(prev => editing ? prev.map(p => p.id === id ? ghProjeto : p) : [ghProjeto, ...prev])
    toast({ title: editing ? 'Projeto atualizado' : 'Projeto criado' })
    setShowForm(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este projeto?')) return
    if (isDemoMode) {
      setProjetos(prev => prev.filter(p => p.id !== id))
      toast({ title: 'Projeto removido' })
      return
    }
    try {
      await deleteProjeto(id)
    } catch (err: any) { toast({ title: 'Erro ao remover', variant: 'destructive' }); return }
    setProjetos(prev => prev.filter(p => p.id !== id))
    toast({ title: 'Projeto removido' })
  }

  return (
    <div className="animate-fade-in space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
            <FolderKanban className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Projetos Financiados</h1>
            <p className="text-sm text-gray-500">Catálogo de projetos com financiamento externo</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => exportExcel(projetos)}><FileText className="w-4 h-4" /> Excel</Button>
          <Button variant="outline" size="sm" onClick={() => exportPDF(projetos)}><FileText className="w-4 h-4" /> PDF</Button>
          <Button size="sm" onClick={openNew}><Plus className="w-4 h-4" /> Novo Projeto</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-yellow-100 flex items-center justify-center"><FolderKanban className="w-5 h-5 text-yellow-600" /></div>
            <div><p className="text-sm text-gray-500">Projetos</p><p className="text-2xl font-bold text-gray-900">{projetos.length}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center"><DollarSign className="w-5 h-5 text-green-600" /></div>
            <div><p className="text-sm text-gray-500">Total Aportes</p><p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAportes)}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center"><Users className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-sm text-gray-500">Docentes Envolvidos</p><p className="text-2xl font-bold text-gray-900">{new Set(projetos.flatMap(p => p.docentes_envolvidos ?? [])).size}</p></div>
          </div>
        </CardContent></Card>
      </div>

      {/* Project cards */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-yellow-500 rounded-full animate-spin" />
        </div>
      ) : projetos.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center py-12 text-gray-400">
          <FolderKanban className="w-10 h-10 mb-2" />
          <p className="text-sm">Nenhum projeto cadastrado</p>
          <Button variant="ghost" size="sm" className="mt-3" onClick={openNew}>Adicionar primeiro projeto</Button>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {projetos.map(p => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">{p.nome_projeto}</CardTitle>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                  </div>
                </div>
                {p.financiadores && <Badge className="bg-yellow-100 text-yellow-700 border-0 w-fit">{p.financiadores}</Badge>}
                {p.resumo_projeto && (
                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">{p.resumo_projeto}</p>
                )}
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {p.instituicoes_envolvidas && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-xs font-medium text-gray-400 w-20">Instituições</span>
                    {p.instituicoes_envolvidas}
                  </div>
                )}
                {p.numero_processo && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-xs font-medium text-gray-400 w-20">Processo</span>
                    {p.numero_processo}
                  </div>
                )}
                {p.chamadas_editais && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-xs font-medium text-gray-400 w-20">Edital</span>
                    {p.chamadas_editais}
                  </div>
                )}
                {(p.vigencia_inicio || p.vigencia_fim) && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>{formatDate(p.vigencia_inicio ?? null)} — {formatDate(p.vigencia_fim ?? null)}</span>
                  </div>
                )}
                {p.total_aportes != null && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-3.5 h-3.5 text-green-500" />
                    <span className="font-semibold text-green-700">{formatCurrency(p.total_aportes)}</span>
                  </div>
                )}
                {(p.docentes_envolvidos ?? []).length > 0 && (
                  <div className="pt-1">
                    <p className="text-xs font-medium text-gray-400 mb-1.5">Docentes Envolvidos</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(p.docentes_envolvidos ?? []).map(d => (
                        <Badge key={d} variant="outline" className="text-xs">{d}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Projeto' : 'Novo Projeto Financiado'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Nome do Projeto *</Label>
              <Input
                value={form.nome_projeto}
                onChange={e => setForm(f => ({ ...f, nome_projeto: e.target.value }))}
                placeholder="Título do projeto"
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Resumo do Projeto</Label>
              <Textarea
                value={form.resumo_projeto}
                onChange={e => setForm(f => ({ ...f, resumo_projeto: e.target.value }))}
                placeholder="Breve descrição dos objetivos e escopo do projeto"
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nº do Processo</Label>
              <Input
                value={form.numero_processo}
                onChange={e => setForm(f => ({ ...f, numero_processo: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Financiadores</Label>
              <Input
                value={form.financiadores}
                onChange={e => setForm(f => ({ ...f, financiadores: e.target.value }))}
                placeholder="Ex: CNPq, FAPERJ"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Chamadas / Editais</Label>
              <Input
                value={form.chamadas_editais}
                onChange={e => setForm(f => ({ ...f, chamadas_editais: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Total de Aportes (R$)</Label>
              <Input
                type="number"
                value={form.total_aportes ?? ''}
                onChange={e => setForm(f => ({ ...f, total_aportes: e.target.value ? Number(e.target.value) : undefined }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Vigência Início</Label>
              <Input
                type="date"
                value={form.vigencia_inicio}
                onChange={e => setForm(f => ({ ...f, vigencia_inicio: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Vigência Fim</Label>
              <Input
                type="date"
                value={form.vigencia_fim}
                onChange={e => setForm(f => ({ ...f, vigencia_fim: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Instituições Envolvidas</Label>
              <Input
                value={form.instituicoes_envolvidas}
                onChange={e => setForm(f => ({ ...f, instituicoes_envolvidas: e.target.value }))}
                placeholder="Ex: UFRJ, UNICAMP, FIOCRUZ"
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Docentes Envolvidos</Label>
              <Input
                value={form.docentes_str}
                onChange={e => setForm(f => ({ ...f, docentes_str: e.target.value }))}
                placeholder="Separados por ponto e vírgula: Prof. A; Prof. B"
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
