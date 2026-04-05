import { useState, useEffect } from 'react'
import { Network, Plus, Pencil, Trash2, FileSpreadsheet, FileText, Filter } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useAuth } from '@/contexts/AuthContext'
import { useDemoData } from '@/hooks/useDemoData'
import { useToast } from '@/hooks/useToast'
import { loadNucleacoes, saveNucleacao, deleteNucleacao } from '@/lib/githubStorage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { InstitutionSelector } from '@/components/ui/institution-selector'
import type { Nucleacao } from '@/types'

// ─── Tipos e constantes ───────────────────────────────────────────────────

type NucleacaoForm = {
  nome_egresso: string
  curso: 'Mestrado' | 'Doutorado' | 'Pós-Doutorado'
  ano_conclusao: string
  ano_nucleacao: string
  tipo_insercao: 'Bolsa' | 'Contrato Temporário' | 'Contrato Permanente'
  agencia_fomento: string
  tipo_instituicao: 'Pública' | 'Privada' | ''
  nome_instituicao: string
  observacoes: string
}

const emptyForm: NucleacaoForm = {
  nome_egresso: '',
  curso: 'Mestrado',
  ano_conclusao: '',
  ano_nucleacao: '',
  tipo_insercao: 'Bolsa',
  agencia_fomento: '',
  tipo_instituicao: '',
  nome_instituicao: '',
  observacoes: '',
}

const CURSOS = ['Mestrado', 'Doutorado', 'Pós-Doutorado'] as const
const TIPOS_INSERCAO = ['Bolsa', 'Contrato Temporário', 'Contrato Permanente'] as const

const CURSO_COLORS: Record<string, string> = {
  Mestrado: 'bg-blue-100 text-blue-700',
  Doutorado: 'bg-purple-100 text-purple-700',
  'Pós-Doutorado': 'bg-orange-100 text-orange-700',
}

const TIPO_COLORS: Record<string, string> = {
  Bolsa: 'bg-green-100 text-green-700',
  'Contrato Temporário': 'bg-yellow-100 text-yellow-700',
  'Contrato Permanente': 'bg-teal-100 text-teal-700',
}

// ─── Export functions ─────────────────────────────────────────────────────

function exportExcel(nucleacoes: Nucleacao[]) {
  const ws = XLSX.utils.json_to_sheet(
    nucleacoes.map((n) => ({
      'Nome do Egresso': n.nome_egresso,
      Curso: n.curso,
      'Ano Conclusão': n.ano_conclusao,
      'Ano Nucleação': n.ano_nucleacao,
      'Tipo Inserção': n.tipo_insercao,
      'Agência de Fomento': n.agencia_fomento ?? '',
      'Tipo Instituição': n.tipo_instituicao ?? '',
      'Nome da Instituição': n.nome_instituicao ?? '',
      Observações: n.observacoes ?? '',
    }))
  )
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Nucleação')
  XLSX.writeFile(wb, 'nucleacao.xlsx')
}

function exportPDF(nucleacoes: Nucleacao[]) {
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text('Nucleação de Egressos', 14, 22)
  autoTable(doc, {
    startY: 30,
    head: [['Nome', 'Curso', 'Ano Conclusão', 'Ano Nucleação', 'Tipo Inserção', 'Instituição / Agência']],
    body: nucleacoes.map((n) => [
      n.nome_egresso,
      n.curso,
      String(n.ano_conclusao),
      String(n.ano_nucleacao),
      n.tipo_insercao,
      n.tipo_insercao === 'Bolsa' ? (n.agencia_fomento ?? '—') : (n.nome_instituicao ?? '—'),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [234, 88, 12] },
  })
  doc.save('nucleacao.pdf')
}

// ─── Page component ───────────────────────────────────────────────────────

export function Nucleacao() {
  const { isDemoMode } = useAuth()
  const { toast } = useToast()
  const demo = useDemoData()

  const [nucleacoes, setNucleacoes] = useState<Nucleacao[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Nucleacao | null>(null)
  const [form, setForm] = useState<NucleacaoForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [filterCurso, setFilterCurso] = useState('Todos')
  const [filterTipo, setFilterTipo] = useState('Todos')

  // ── Load data ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isDemoMode) {
      setNucleacoes(demo.nucleacoes)
      setLoading(false)
      return
    }
    loadNucleacoes()
      .then(setNucleacoes)
      .catch((err) => toast({ title: 'Erro ao carregar', description: err.message, variant: 'destructive' }))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemoMode])

  // ── Derived data ───────────────────────────────────────────────────────
  const filtered = nucleacoes.filter(
    (n) =>
      (filterCurso === 'Todos' || n.curso === filterCurso) &&
      (filterTipo === 'Todos' || n.tipo_insercao === filterTipo)
  )

  // ── Open form ──────────────────────────────────────────────────────────
  function openNew() {
    setEditing(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  function openEdit(n: Nucleacao) {
    setEditing(n)
    setForm({
      nome_egresso: n.nome_egresso,
      curso: n.curso,
      ano_conclusao: String(n.ano_conclusao),
      ano_nucleacao: String(n.ano_nucleacao),
      tipo_insercao: n.tipo_insercao,
      agencia_fomento: n.agencia_fomento ?? '',
      tipo_instituicao: n.tipo_instituicao ?? '',
      nome_instituicao: n.nome_instituicao ?? '',
      observacoes: n.observacoes ?? '',
    })
    setShowForm(true)
  }

  // ── Save ───────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!form.nome_egresso.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' })
      return
    }
    if (!form.ano_conclusao) {
      toast({ title: 'Ano de conclusão obrigatório', variant: 'destructive' })
      return
    }
    if (!form.ano_nucleacao) {
      toast({ title: 'Ano de nucleação obrigatório', variant: 'destructive' })
      return
    }

    const isContrato =
      form.tipo_insercao === 'Contrato Temporário' ||
      form.tipo_insercao === 'Contrato Permanente'

    const payload = {
      nome_egresso: form.nome_egresso.trim(),
      curso: form.curso,
      ano_conclusao: Number(form.ano_conclusao),
      ano_nucleacao: Number(form.ano_nucleacao),
      tipo_insercao: form.tipo_insercao,
      agencia_fomento: form.tipo_insercao === 'Bolsa' ? form.agencia_fomento || undefined : undefined,
      tipo_instituicao: isContrato && form.tipo_instituicao ? (form.tipo_instituicao as 'Pública' | 'Privada') : undefined,
      nome_instituicao: isContrato ? form.nome_instituicao || undefined : undefined,
      observacoes: form.observacoes || undefined,
    }

    setSaving(true)

    if (isDemoMode) {
      const now = new Date().toISOString()
      if (editing) {
        setNucleacoes((prev) =>
          prev.map((n) => (n.id === editing.id ? { ...n, ...payload, updated_at: now } : n))
        )
      } else {
        setNucleacoes((prev) => [
          { id: Date.now().toString(), user_id: 'demo-user-id', ...payload, created_at: now, updated_at: now } as Nucleacao,
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
    const ghNucleacao: Nucleacao = {
      id,
      user_id: 'github-user',
      ...payload,
      created_at: editing?.created_at ?? now,
      updated_at: now,
    }
    try {
      await saveNucleacao(ghNucleacao)
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
      setSaving(false)
      return
    }
    setNucleacoes((prev) =>
      editing ? prev.map((n) => (n.id === id ? ghNucleacao : n)) : [ghNucleacao, ...prev]
    )
    toast({ title: editing ? 'Registro atualizado' : 'Registro criado' })
    setSaving(false)
    setShowForm(false)
  }

  // ── Delete ─────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!confirm('Remover este registro de nucleação?')) return
    if (isDemoMode) {
      setNucleacoes((prev) => prev.filter((n) => n.id !== id))
    } else {
      try {
        await deleteNucleacao(id)
        setNucleacoes((prev) => prev.filter((n) => n.id !== id))
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
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
            <Network className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nucleação</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Inserção profissional de egressos</p>
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
            Novo Registro
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
            <p className="text-2xl font-bold text-orange-600">{nucleacoes.length}</p>
          </CardContent>
        </Card>
        {CURSOS.map((c) => (
          <Card key={c}>
            <CardContent className="pt-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">{c}</p>
              <p className="text-2xl font-bold text-gray-700 dark:text-gray-200">
                {nucleacoes.filter((n) => n.curso === c).length}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        <div className="flex gap-1 flex-wrap">
          {['Todos', ...CURSOS].map((c) => (
            <button
              key={c}
              onClick={() => setFilterCurso(c)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filterCurso === c
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
        <div className="flex gap-1 flex-wrap">
          {['Todos', ...TIPOS_INSERCAO].map((t) => (
            <button
              key={t}
              onClick={() => setFilterTipo(t)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filterTipo === t
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-400 dark:text-gray-500">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-400 dark:text-gray-500">
              {nucleacoes.length === 0
                ? 'Nenhum registro ainda. Clique em "Novo Registro" para começar.'
                : 'Nenhum registro corresponde aos filtros selecionados.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-700">
                    <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-200">Nome do Egresso</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-200">Curso</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-200">Ano Conclusão</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-200">Ano Nucleação</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-200">Tipo Inserção</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-200">Instituição / Agência</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((n) => (
                    <tr key={n.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{n.nome_egresso}</td>
                      <td className="px-4 py-3">
                        <Badge className={CURSO_COLORS[n.curso] ?? ''}>{n.curso}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{n.ano_conclusao}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{n.ano_nucleacao}</td>
                      <td className="px-4 py-3">
                        <Badge className={TIPO_COLORS[n.tipo_insercao] ?? ''}>{n.tipo_insercao}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 max-w-[200px] truncate">
                        {n.tipo_insercao === 'Bolsa'
                          ? n.agencia_fomento ?? '—'
                          : n.nome_instituicao ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(n)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(n.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!saving) setShowForm(o) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-gray-900 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Registro' : 'Novo Registro de Nucleação'}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            {/* Nome */}
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="nc-nome">Nome do(a) Egresso(a) *</Label>
              <Input
                id="nc-nome"
                value={form.nome_egresso}
                onChange={(e) => setForm((f) => ({ ...f, nome_egresso: e.target.value }))}
                placeholder="Nome completo"
              />
            </div>

            {/* Curso */}
            <div className="space-y-1.5">
              <Label htmlFor="nc-curso">Curso *</Label>
              <select
                id="nc-curso"
                value={form.curso}
                onChange={(e) => setForm((f) => ({ ...f, curso: e.target.value as NucleacaoForm['curso'] }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {CURSOS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Tipo Inserção */}
            <div className="space-y-1.5">
              <Label htmlFor="nc-tipo">Tipo de Inserção *</Label>
              <select
                id="nc-tipo"
                value={form.tipo_insercao}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    tipo_insercao: e.target.value as NucleacaoForm['tipo_insercao'],
                    agencia_fomento: '',
                    tipo_instituicao: '',
                    nome_instituicao: '',
                  }))
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {TIPOS_INSERCAO.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Anos */}
            <div className="space-y-1.5">
              <Label htmlFor="nc-conclusao">Ano de Conclusão *</Label>
              <Input
                id="nc-conclusao"
                type="number"
                value={form.ano_conclusao}
                onChange={(e) => setForm((f) => ({ ...f, ano_conclusao: e.target.value }))}
                placeholder="Ex: 2023"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nc-nucleacao">Ano de Nucleação *</Label>
              <Input
                id="nc-nucleacao"
                type="number"
                value={form.ano_nucleacao}
                onChange={(e) => setForm((f) => ({ ...f, ano_nucleacao: e.target.value }))}
                placeholder="Ex: 2023"
              />
            </div>

            {/* Bolsa: agência de fomento */}
            {form.tipo_insercao === 'Bolsa' && (
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="nc-agencia">Agência de Fomento</Label>
                <Textarea
                  id="nc-agencia"
                  value={form.agencia_fomento}
                  onChange={(e) => setForm((f) => ({ ...f, agencia_fomento: e.target.value }))}
                  placeholder="Ex: CAPES — Programa de Fixação de Doutores"
                  rows={2}
                />
              </div>
            )}

            {/* Contrato: tipo + nome da instituição */}
            {(form.tipo_insercao === 'Contrato Temporário' ||
              form.tipo_insercao === 'Contrato Permanente') && (
              <>
                <div className="col-span-2 space-y-1.5">
                  <Label>Tipo de Instituição</Label>
                  <div className="flex gap-6">
                    {(['Pública', 'Privada'] as const).map((opt) => (
                      <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={form.tipo_instituicao === opt}
                          onCheckedChange={() =>
                            setForm((f) => ({
                              ...f,
                              tipo_instituicao: f.tipo_instituicao === opt ? '' : opt,
                            }))
                          }
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Nome da Instituição</Label>
                  <InstitutionSelector
                    mode="single"
                    value={form.nome_instituicao}
                    onChange={(val) => setForm((f) => ({ ...f, nome_instituicao: val }))}
                    placeholder="Buscar instituição..."
                  />
                </div>
              </>
            )}

            {/* Observações */}
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="nc-obs">Observações</Label>
              <Textarea
                id="nc-obs"
                value={form.observacoes}
                onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                placeholder="Informações adicionais..."
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
