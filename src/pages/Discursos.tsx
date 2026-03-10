import { useState, useEffect } from 'react'
import { Plus, MessageSquareText, Pencil, Trash2, FileText, Link as LinkIcon } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useDemoData } from '@/hooks/useDemoData'
import { useToast } from '@/hooks/useToast'
import { loadDiscursos, saveDiscurso, deleteDiscurso } from '@/lib/githubStorage'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ToastContainer } from '@/components/ui/toast'
import type { Discurso } from '@/types'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function exportPDF(discursos: Discurso[]) {
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text('Discursos Qualificados', 14, 22)
  autoTable(doc, {
    startY: 30,
    head: [['Ano', 'Descrição', 'Justificativa']],
    body: discursos.map(d => [String(d.ano), d.descricao, d.justificativa ?? '—']),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [22, 163, 74] },
  })
  doc.save('discursos.pdf')
}

function exportExcel(discursos: Discurso[]) {
  const ws = XLSX.utils.json_to_sheet(discursos.map(d => ({
    Ano: d.ano,
    Descrição: d.descricao,
    Justificativa: d.justificativa ?? '',
    Links: d.links_comprovacao ?? '',
    Repercussões: d.repercussoes_produtos ?? '',
  })))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Discursos')
  XLSX.writeFile(wb, 'discursos.xlsx')
}

type DiscursoForm = Omit<Discurso, 'id' | 'user_id' | 'created_at'>
const emptyForm: DiscursoForm = {
  ano: new Date().getFullYear(),
  descricao: '',
  justificativa: '',
  links_comprovacao: '',
  repercussoes_produtos: '',
}

export function Discursos() {
  const { isDemoMode } = useAuth()
  const demo = useDemoData()
  const { toasts, toast, dismiss } = useToast()

  const [discursos, setDiscursos] = useState<Discurso[]>(isDemoMode ? demo.discursos : [])
  const [loading, setLoading] = useState(!isDemoMode)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Discurso | null>(null)
  const [form, setForm] = useState<DiscursoForm>(emptyForm)

  useEffect(() => {
    if (isDemoMode) return
    loadDiscursos().then(data => { setDiscursos(data); setLoading(false) })
      .catch(err => { toast({ title: 'Erro ao carregar', description: err.message, variant: 'destructive' }); setLoading(false) })
  }, [isDemoMode])

  const years = [...new Set(discursos.map(d => d.ano))].sort((a, b) => b - a)

  function openNew() { setEditing(null); setForm(emptyForm); setShowForm(true) }
  function openEdit(d: Discurso) {
    setEditing(d)
    setForm({
      ano: d.ano,
      descricao: d.descricao,
      justificativa: d.justificativa ?? '',
      links_comprovacao: d.links_comprovacao ?? '',
      repercussoes_produtos: d.repercussoes_produtos ?? '',
    })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.descricao.trim()) { toast({ title: 'Descrição obrigatória', variant: 'destructive' }); return }
    if (isDemoMode) {
      if (editing) {
        setDiscursos(prev => prev.map(d => d.id === editing.id ? { ...d, ...form, ano: Number(form.ano) } : d))
      } else {
        setDiscursos(prev => [{
          id: Date.now().toString(), user_id: 'demo-user-id',
          ...form, ano: Number(form.ano), created_at: new Date().toISOString(),
        }, ...prev])
      }
      toast({ title: editing ? 'Discurso atualizado' : 'Discurso criado' })
      setShowForm(false)
      return
    }
    const now = new Date().toISOString()
    const id = editing ? editing.id : crypto.randomUUID()
    const ghDiscurso: Discurso = { ...form, ano: Number(form.ano), id, user_id: 'github-user', created_at: editing?.created_at ?? now }
    try {
      await saveDiscurso(ghDiscurso)
    } catch (err: any) { toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' }); return }
    setDiscursos(prev => editing ? prev.map(d => d.id === id ? ghDiscurso : d) : [ghDiscurso, ...prev])
    toast({ title: editing ? 'Discurso atualizado' : 'Discurso criado' })
    setShowForm(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este discurso?')) return
    if (isDemoMode) {
      setDiscursos(prev => prev.filter(d => d.id !== id))
      toast({ title: 'Discurso removido' })
      return
    }
    try {
      await deleteDiscurso(id)
    } catch (err: any) { toast({ title: 'Erro ao remover', variant: 'destructive' }); return }
    setDiscursos(prev => prev.filter(d => d.id !== id))
    toast({ title: 'Discurso removido' })
  }

  return (
    <div className="animate-fade-in space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <MessageSquareText className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Discursos Qualificados</h1>
            <p className="text-sm text-gray-500">Registro de produções e impactos qualificados</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => exportExcel(discursos)}>
            <FileText className="w-4 h-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportPDF(discursos)}>
            <FileText className="w-4 h-4" /> PDF
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus className="w-4 h-4" /> Novo Discurso
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 pb-4">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-3xl font-bold text-gray-900">{discursos.length}</p>
          </CardContent>
        </Card>
        {years.slice(0, 3).map(y => (
          <Card key={y}>
            <CardContent className="pt-6 pb-4">
              <p className="text-sm text-gray-500">{y}</p>
              <p className="text-3xl font-bold text-green-700">{discursos.filter(d => d.ano === y).length}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cards by year */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-green-500 rounded-full animate-spin" />
        </div>
      ) : years.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-gray-400">
            <MessageSquareText className="w-10 h-10 mb-2" />
            <p className="text-sm">Nenhum discurso cadastrado</p>
            <Button variant="ghost" size="sm" className="mt-3" onClick={openNew}>
              Adicionar primeiro discurso
            </Button>
          </CardContent>
        </Card>
      ) : (
        years.map(year => (
          <div key={year}>
            <div className="flex items-center gap-2 mb-3">
              <Badge className="bg-green-100 text-green-700 border-0">{year}</Badge>
              <span className="text-sm text-gray-500">
                {discursos.filter(d => d.ano === year).length} registro{discursos.filter(d => d.ano === year).length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-3">
              {discursos.filter(d => d.ano === year).map(d => {
                const links = d.links_comprovacao?.split('\n').filter(Boolean) ?? []
                return (
                  <Card key={d.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-5 pb-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900">{d.descricao}</p>
                          {d.justificativa && (
                            <p className="text-sm text-gray-500 mt-1">{d.justificativa}</p>
                          )}
                          {d.repercussoes_produtos && (
                            <div className="mt-2 p-2 bg-green-50 rounded-lg">
                              <p className="text-xs font-semibold text-green-700 mb-0.5">Repercussões / Produtos</p>
                              <p className="text-xs text-green-600">{d.repercussoes_produtos}</p>
                            </div>
                          )}
                          {links.length > 0 && (
                            <div className="mt-2 flex flex-col gap-1">
                              {links.map((url, i) => (
                                <a
                                  key={i}
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                                >
                                  <LinkIcon className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate">{url}</span>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(d)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)}>
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        ))
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Discurso' : 'Novo Discurso Qualificado'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Ano *</Label>
              <Input
                type="number"
                value={form.ano}
                onChange={e => setForm(f => ({ ...f, ano: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição *</Label>
              <Textarea
                value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Descreva o discurso ou produção qualificada"
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Justificativa</Label>
              <Textarea
                value={form.justificativa}
                onChange={e => setForm(f => ({ ...f, justificativa: e.target.value }))}
                placeholder="Por que esta produção é qualificada?"
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Links de Comprovação</Label>
              <Textarea
                value={form.links_comprovacao}
                onChange={e => setForm(f => ({ ...f, links_comprovacao: e.target.value }))}
                placeholder={`Um link por linha:\nhttps://...`}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Repercussões / Produtos</Label>
              <Textarea
                value={form.repercussoes_produtos}
                onChange={e => setForm(f => ({ ...f, repercussoes_produtos: e.target.value }))}
                placeholder="Descreva os produtos derivados ou repercussões"
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
