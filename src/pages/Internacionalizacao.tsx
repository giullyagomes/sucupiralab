import { useState, useEffect } from 'react'
import { Globe, Plus, Pencil, Trash2, FileSpreadsheet, FileText, ChevronDown, ChevronUp } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useAuth } from '@/contexts/AuthContext'
import { useDemoData } from '@/hooks/useDemoData'
import { useToast } from '@/hooks/useToast'
import {
  loadInternacionalizacoes,
  saveInternacionalizacao,
  deleteInternacionalizacao,
} from '@/lib/githubStorage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { TagInput } from '@/components/ui/tag-input'
import { InstitutionSelector } from '@/components/ui/institution-selector'
import type { Internacionalizacao } from '@/types'

// ─── Tipos e constantes ───────────────────────────────────────────────────

type InternacionalizacaoForm = {
  titulo: string
  ano_inicio: string
  situacao: 'Em Andamento' | 'Concluída'
  ano_encerramento: string
  programas_pos: string[]
  instituicoes: string[]
  membros_equipe: string[]
  edital: string
  financiamento: string
  recursos: string
  descricao: string
  resultados: string
}

const emptyForm: InternacionalizacaoForm = {
  titulo: '',
  ano_inicio: '',
  situacao: 'Em Andamento',
  ano_encerramento: '',
  programas_pos: [],
  instituicoes: [],
  membros_equipe: [],
  edital: '',
  financiamento: '',
  recursos: '',
  descricao: '',
  resultados: '',
}

const SITUACAO_COLORS: Record<string, string> = {
  'Em Andamento': 'bg-blue-100 text-blue-700',
  Concluída: 'bg-green-100 text-green-700',
}

// ─── Export functions ─────────────────────────────────────────────────────

function exportExcel(items: Internacionalizacao[]) {
  const ws = XLSX.utils.json_to_sheet(
    items.map((i) => ({
      Título: i.titulo,
      'Ano Início': i.ano_inicio,
      Situação: i.situacao,
      'Ano Encerramento': i.ano_encerramento ?? '',
      'Programas de PG': (i.programas_pos ?? []).join('; '),
      Instituições: (i.instituicoes ?? []).join('; '),
      'Membros da Equipe': (i.membros_equipe ?? []).join('; '),
      Edital: i.edital ?? '',
      Financiamento: i.financiamento ?? '',
      Recursos: i.recursos ?? '',
      Descrição: i.descricao ?? '',
      Resultados: i.resultados ?? '',
    }))
  )
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Internacionalização')
  XLSX.writeFile(wb, 'internacionalizacao.xlsx')
}

function exportPDF(items: Internacionalizacao[]) {
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text('Internacionalização', 14, 22)
  autoTable(doc, {
    startY: 30,
    head: [['Título', 'Ano Início', 'Situação', 'Instituições', 'Financiamento']],
    body: items.map((i) => [
      i.titulo.length > 50 ? i.titulo.slice(0, 47) + '...' : i.titulo,
      String(i.ano_inicio),
      i.situacao,
      (i.instituicoes ?? []).join(', ').slice(0, 40) || '—',
      i.financiamento ?? '—',
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [79, 70, 229] },
  })
  doc.save('internacionalizacao.pdf')
}

// ─── Page component ───────────────────────────────────────────────────────

export function Internacionalizacao() {
  const { isDemoMode } = useAuth()
  const { toast } = useToast()
  const demo = useDemoData()

  const [items, setItems] = useState<Internacionalizacao[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Internacionalizacao | null>(null)
  const [form, setForm] = useState<InternacionalizacaoForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [filterSituacao, setFilterSituacao] = useState('Todas')
  const [expanded, setExpanded] = useState<string | null>(null)

  // ── Load data ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isDemoMode) {
      setItems(demo.internacionalizacoes)
      setLoading(false)
      return
    }
    loadInternacionalizacoes()
      .then(setItems)
      .catch((err) => toast({ title: 'Erro ao carregar', description: err.message, variant: 'destructive' }))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemoMode])

  // ── Derived data ───────────────────────────────────────────────────────
  const filtered = items.filter(
    (i) => filterSituacao === 'Todas' || i.situacao === filterSituacao
  )

  const emAndamento = items.filter((i) => i.situacao === 'Em Andamento').length
  const concluidas = items.filter((i) => i.situacao === 'Concluída').length

  // ── Open form ──────────────────────────────────────────────────────────
  function openNew() {
    setEditing(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  function openEdit(item: Internacionalizacao) {
    setEditing(item)
    setForm({
      titulo: item.titulo,
      ano_inicio: String(item.ano_inicio),
      situacao: item.situacao,
      ano_encerramento: item.ano_encerramento ? String(item.ano_encerramento) : '',
      programas_pos: item.programas_pos ?? [],
      instituicoes: item.instituicoes ?? [],
      membros_equipe: item.membros_equipe ?? [],
      edital: item.edital ?? '',
      financiamento: item.financiamento ?? '',
      recursos: item.recursos ?? '',
      descricao: item.descricao ?? '',
      resultados: item.resultados ?? '',
    })
    setShowForm(true)
  }

  // ── Save ───────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!form.titulo.trim()) {
      toast({ title: 'Título obrigatório', variant: 'destructive' })
      return
    }
    if (!form.ano_inicio) {
      toast({ title: 'Ano de início obrigatório', variant: 'destructive' })
      return
    }

    const payload = {
      titulo: form.titulo.trim(),
      ano_inicio: Number(form.ano_inicio),
      situacao: form.situacao,
      ano_encerramento:
        form.situacao === 'Concluída' && form.ano_encerramento
          ? Number(form.ano_encerramento)
          : undefined,
      programas_pos: form.programas_pos.length > 0 ? form.programas_pos : undefined,
      instituicoes: form.instituicoes.length > 0 ? form.instituicoes : undefined,
      membros_equipe: form.membros_equipe.length > 0 ? form.membros_equipe : undefined,
      edital: form.edital || undefined,
      financiamento: form.financiamento || undefined,
      recursos: form.recursos || undefined,
      descricao: form.descricao || undefined,
      resultados: form.resultados || undefined,
    }

    setSaving(true)

    if (isDemoMode) {
      const now = new Date().toISOString()
      if (editing) {
        setItems((prev) =>
          prev.map((i) => (i.id === editing.id ? { ...i, ...payload, updated_at: now } : i))
        )
      } else {
        setItems((prev) => [
          {
            id: Date.now().toString(),
            user_id: 'demo-user-id',
            ...payload,
            created_at: now,
            updated_at: now,
          } as Internacionalizacao,
          ...prev,
        ])
      }
      toast({ title: editing ? 'Registro atualizado' : 'Registro criado' })
      setSaving(false)
      setShowForm(false)
      return
    }

    const now = new Date().toISOString()
    const id = editing ? editing.id : crypto.randomUUID()
    const ghItem: Internacionalizacao = {
      id,
      user_id: 'github-user',
      ...payload,
      created_at: editing?.created_at ?? now,
      updated_at: now,
    }
    try {
      await saveInternacionalizacao(ghItem)
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
      setSaving(false)
      return
    }
    setItems((prev) =>
      editing ? prev.map((i) => (i.id === id ? ghItem : i)) : [ghItem, ...prev]
    )
    toast({ title: editing ? 'Registro atualizado' : 'Registro criado' })
    setSaving(false)
    setShowForm(false)
  }

  // ── Delete ─────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!confirm('Remover este registro de internacionalização?')) return
    if (isDemoMode) {
      setItems((prev) => prev.filter((i) => i.id !== id))
    } else {
      try {
        await deleteInternacionalizacao(id)
        setItems((prev) => prev.filter((i) => i.id !== id))
      } catch (err: any) {
        toast({ title: 'Erro ao remover', description: err.message, variant: 'destructive' })
        return
      }
    }
    toast({ title: 'Registro removido' })
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Globe className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Internacionalização</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Projetos e redes internacionais</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => exportExcel(filtered)} disabled={filtered.length === 0}>
            <FileSpreadsheet className="w-4 h-4" />
            XLS
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportPDF(filtered)} disabled={filtered.length === 0}>
            <FileText className="w-4 h-4" />
            PDF
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus className="w-4 h-4" />
            Nova Entrada
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
            <p className="text-2xl font-bold text-indigo-600">{items.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Em Andamento</p>
            <p className="text-2xl font-bold text-blue-600">{emAndamento}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Concluídas</p>
            <p className="text-2xl font-bold text-green-600">{concluidas}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['Todas', 'Em Andamento', 'Concluída'].map((s) => (
          <button
            key={s}
            onClick={() => setFilterSituacao(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterSituacao === s
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Card list */}
      {loading ? (
        <div className="text-center text-gray-400 dark:text-gray-500 py-8">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-400 dark:text-gray-500 py-8">
          {items.length === 0
            ? 'Nenhum registro ainda. Clique em "Nova Entrada" para começar.'
            : 'Nenhum registro corresponde ao filtro selecionado.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const isOpen = expanded === item.id
            return (
              <Card key={item.id} className="overflow-hidden">
                {/* Card header */}
                <div
                  className="flex items-start justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : item.id)}
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">{item.titulo}</h3>
                      <Badge className={SITUACAO_COLORS[item.situacao] ?? ''}>{item.situacao}</Badge>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {item.ano_inicio}
                      {item.ano_encerramento ? ` – ${item.ano_encerramento}` : ''}
                      {(item.instituicoes ?? []).length > 0 && (
                        <> · {(item.instituicoes ?? []).length} instituição(ões)</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); openEdit(item) }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => { e.stopPropagation(); handleDelete(item.id) }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t dark:border-gray-700 px-5 py-4 space-y-4 bg-gray-50/50 dark:bg-gray-800/50">
                    {/* Pills sections */}
                    {(item.programas_pos ?? []).length > 0 && (
                      <DetailRow label="Programas de PG">
                        <div className="flex flex-wrap gap-1.5">
                          {(item.programas_pos ?? []).map((p, i) => (
                            <span key={i} className="bg-indigo-100 text-indigo-700 rounded-full px-2.5 py-0.5 text-xs font-medium">{p}</span>
                          ))}
                        </div>
                      </DetailRow>
                    )}

                    {(item.instituicoes ?? []).length > 0 && (
                      <DetailRow label="Instituições Envolvidas">
                        <div className="flex flex-wrap gap-1.5">
                          {(item.instituicoes ?? []).map((inst, i) => (
                            <span key={i} className="bg-blue-100 text-blue-700 rounded-full px-2.5 py-0.5 text-xs font-medium">{inst}</span>
                          ))}
                        </div>
                      </DetailRow>
                    )}

                    {(item.membros_equipe ?? []).length > 0 && (
                      <DetailRow label="Membros da Equipe">
                        <div className="flex flex-wrap gap-1.5">
                          {(item.membros_equipe ?? []).map((m, i) => (
                            <span key={i} className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-full px-2.5 py-0.5 text-xs font-medium">{m}</span>
                          ))}
                        </div>
                      </DetailRow>
                    )}

                    {/* Text fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {item.edital && <DetailRow label="Edital"><p className="text-sm text-gray-700 dark:text-gray-200">{item.edital}</p></DetailRow>}
                      {item.financiamento && <DetailRow label="Financiamento"><p className="text-sm text-gray-700 dark:text-gray-200">{item.financiamento}</p></DetailRow>}
                      {item.recursos && <DetailRow label="Recursos"><p className="text-sm text-gray-700 dark:text-gray-200">{item.recursos}</p></DetailRow>}
                    </div>

                    {item.descricao && (
                      <DetailRow label="Descrição">
                        <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-line">{item.descricao}</p>
                      </DetailRow>
                    )}
                    {item.resultados && (
                      <DetailRow label="Resultados Obtidos">
                        <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-line">{item.resultados}</p>
                      </DetailRow>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!saving) setShowForm(o) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-gray-900 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Registro' : 'Nova Entrada — Internacionalização'}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            {/* Título */}
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="int-titulo">Título *</Label>
              <Input
                id="int-titulo"
                value={form.titulo}
                onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                placeholder="Título do projeto ou ação de internacionalização"
              />
            </div>

            {/* Ano início */}
            <div className="space-y-1.5">
              <Label htmlFor="int-inicio">Ano de Início *</Label>
              <Input
                id="int-inicio"
                type="number"
                value={form.ano_inicio}
                onChange={(e) => setForm((f) => ({ ...f, ano_inicio: e.target.value }))}
                placeholder="Ex: 2022"
              />
            </div>

            {/* Situação */}
            <div className="space-y-1.5">
              <Label htmlFor="int-situacao">Situação *</Label>
              <select
                id="int-situacao"
                value={form.situacao}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    situacao: e.target.value as InternacionalizacaoForm['situacao'],
                    ano_encerramento: '',
                  }))
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="Em Andamento">Em Andamento</option>
                <option value="Concluída">Concluída</option>
              </select>
            </div>

            {/* Ano encerramento (condicional) */}
            {form.situacao === 'Concluída' && (
              <div className="space-y-1.5">
                <Label htmlFor="int-fim">Ano de Encerramento</Label>
                <Input
                  id="int-fim"
                  type="number"
                  value={form.ano_encerramento}
                  onChange={(e) => setForm((f) => ({ ...f, ano_encerramento: e.target.value }))}
                  placeholder="Ex: 2024"
                />
              </div>
            )}

            {/* Programas de PG */}
            <div className="col-span-2 space-y-1.5">
              <Label>Programas de Pós-Graduação Envolvidos <span className="text-gray-400 dark:text-gray-500 font-normal">(opcional)</span></Label>
              <TagInput
                values={form.programas_pos}
                onChange={(vals) => setForm((f) => ({ ...f, programas_pos: vals }))}
                placeholder="Ex: Informática, Educação — separar por vírgula ou ponto-e-vírgula"
                pillColorClass="bg-indigo-100 text-indigo-700"
              />
            </div>

            {/* Instituições envolvidas */}
            <div className="col-span-2 space-y-1.5">
              <Label>Instituições Envolvidas <span className="text-gray-400 dark:text-gray-500 font-normal">(opcional)</span></Label>
              <InstitutionSelector
                mode="multi"
                values={form.instituicoes}
                onChange={(vals) => setForm((f) => ({ ...f, instituicoes: vals }))}
                placeholder="Buscar e adicionar instituição..."
                pillColorClass="bg-blue-100 text-blue-700"
              />
            </div>

            {/* Membros da equipe */}
            <div className="col-span-2 space-y-1.5">
              <Label>Membros da Equipe <span className="text-gray-400 dark:text-gray-500 font-normal">(opcional)</span></Label>
              <TagInput
                values={form.membros_equipe}
                onChange={(vals) => setForm((f) => ({ ...f, membros_equipe: vals }))}
                placeholder="Ex: Prof. Dr. João Silva — separar por vírgula ou ponto-e-vírgula"
                pillColorClass="bg-gray-200 text-gray-700"
              />
            </div>

            {/* Edital */}
            <div className="space-y-1.5">
              <Label htmlFor="int-edital">Edital <span className="text-gray-400 dark:text-gray-500 font-normal">(opcional)</span></Label>
              <Input
                id="int-edital"
                value={form.edital}
                onChange={(e) => setForm((f) => ({ ...f, edital: e.target.value }))}
                placeholder="Ex: CAPES-COFECUB 2022"
              />
            </div>

            {/* Financiamento */}
            <div className="space-y-1.5">
              <Label htmlFor="int-financiamento">Financiamento <span className="text-gray-400 dark:text-gray-500 font-normal">(opcional)</span></Label>
              <Input
                id="int-financiamento"
                value={form.financiamento}
                onChange={(e) => setForm((f) => ({ ...f, financiamento: e.target.value }))}
                placeholder="Ex: CAPES PrInt, CNPq Universal"
              />
            </div>

            {/* Recursos */}
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="int-recursos">Recursos <span className="text-gray-400 dark:text-gray-500 font-normal">(opcional)</span></Label>
              <Input
                id="int-recursos"
                value={form.recursos}
                onChange={(e) => setForm((f) => ({ ...f, recursos: e.target.value }))}
                placeholder="Ex: R$ 50.000,00 / USD 10.000 / € 5.000 — informe valor e moeda"
              />
            </div>

            {/* Descrição */}
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="int-descricao">Descrição <span className="text-gray-400 dark:text-gray-500 font-normal">(opcional)</span></Label>
              <Textarea
                id="int-descricao"
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                placeholder="Descreva os objetivos e atividades do projeto..."
                rows={3}
              />
            </div>

            {/* Resultados */}
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="int-resultados">Resultados Obtidos <span className="text-gray-400 dark:text-gray-500 font-normal">(opcional)</span></Label>
              <Textarea
                id="int-resultados"
                value={form.resultados}
                onChange={(e) => setForm((f) => ({ ...f, resultados: e.target.value }))}
                placeholder="Descreva os resultados alcançados..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setShowForm(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Criar Registro'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Componente auxiliar de detalhe ───────────────────────────────────────

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
      {children}
    </div>
  )
}
