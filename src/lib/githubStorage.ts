// ─── GitHub-backed YAML storage layer ────────────────────────────────────
// Each entity type is stored as individual YAML files inside a data/ folder
// in the user's GitHub repository.  Sub-entities (Despesas, Tarefas, Eventos)
// are embedded in their parent YAML so the data is self-contained.
//
// Folder structure:
//   data/prestacoes/{id}.yaml   — Prestacao + embedded Despesas
//   data/discursos/{id}.yaml
//   data/projetos/{id}.yaml
//   data/orientacoes/{id}.yaml  — Orientacao + embedded Tarefas
//   data/producao/{id}.yaml
//   data/submissoes/{id}.yaml   — Submissao + embedded Eventos
//
// Binary attachments:
//   attachments/prestacoes/{id}/{filename}
//   attachments/despesas/{id}/{filename}
//   attachments/orientacoes/{id}/{filename}

import { load as yamlLoad, dump as yamlDump } from 'js-yaml'
import {
  getGitHubConfig,
  listDirectory,
  readFile,
  writeTextFile,
  writeBinaryFile,
  deleteFile as ghDeleteFile,
  decodeContent,
  getRawUrl,
} from './github'
import type {
  Prestacao,
  Despesa,
  Discurso,
  ProjetoFinanciado,
  Orientacao,
  Tarefa,
  Publicacao,
  Submissao,
  SubmissaoEvento,
  Anexo,
} from '@/types'

// ─── Internal (persisted) shapes — user_id stripped, sub-entities embedded ──

type StoredAnexo = { id: string; name: string; size: number; type: string; path: string }

type StoredDespesa = {
  id: string
  descricao: string
  data: string
  valor: number
  numero_nota_fiscal?: string
  prestador_servico?: string
  created_at: string
  anexos?: StoredAnexo[]
}

type StoredPrestacao = {
  id: string
  titulo: string
  numero_processo?: string
  numero_edital?: string
  nome_edital?: string
  agencia_fomento?: string
  vigencia_inicio?: string
  vigencia_fim?: string
  total_recursos?: number
  created_at: string
  updated_at: string
  anexo?: StoredAnexo
  despesas: StoredDespesa[]
}

type StoredTarefa = {
  id: string
  descricao: string
  concluida: boolean
  created_at: string
}

type StoredOrientacao = Omit<Orientacao, 'user_id' | 'projeto_original'> & {
  projeto_original?: StoredAnexo
  tarefas: StoredTarefa[]
}

type StoredEvento = {
  id: string
  tipo: string
  descricao?: string
  data?: string
  revista?: string
  created_at: string
}

type StoredSubmissao = Omit<Submissao, 'user_id'> & {
  eventos: StoredEvento[]
}

// ─── SHA cache (avoids extra GET before every PUT) ────────────────────────

const shaCache = new Map<string, string>()

// Placeholder user_id for all entities in GitHub mode
const GH_USER = 'github-user'

// ─── Config helper ────────────────────────────────────────────────────────

function cfg() {
  const c = getGitHubConfig()
  if (!c) throw new Error('GitHub não configurado')
  return c
}

// ─── Anexo conversion ─────────────────────────────────────────────────────

function storedToAnexo(sa: StoredAnexo): Anexo {
  return {
    id: sa.id,
    name: sa.name,
    size: sa.size,
    type: sa.type,
    path: sa.path,
    url: getRawUrl(cfg(), sa.path),
  }
}

function anexoToStored(a: Anexo): StoredAnexo {
  return {
    id: a.id,
    name: a.name,
    size: a.size,
    type: a.type,
    path: a.path ?? '',
  }
}

// ─── Low-level YAML helpers ───────────────────────────────────────────────

async function readYaml<T>(filePath: string): Promise<T> {
  const { content, sha, encoding } = await readFile(cfg(), filePath)
  shaCache.set(filePath, sha)
  const text = encoding === 'base64' ? decodeContent(content) : content
  return yamlLoad(text) as T
}

async function writeYaml<T extends object>(filePath: string, data: T, msg: string): Promise<void> {
  const text = yamlDump(data, { indent: 2, lineWidth: -1, skipInvalid: true })
  const sha = shaCache.get(filePath)
  const result = await writeTextFile(cfg(), filePath, text, msg, sha)
  shaCache.set(filePath, result.content.sha)
}

async function deleteYaml(filePath: string, msg: string): Promise<void> {
  let sha = shaCache.get(filePath)
  if (!sha) {
    const { sha: s } = await readFile(cfg(), filePath)
    sha = s
  }
  await ghDeleteFile(cfg(), filePath, sha, msg)
  shaCache.delete(filePath)
}

async function listYamls(dirPath: string): Promise<string[]> {
  const entries = await listDirectory(cfg(), dirPath)
  return entries
    .filter((e) => e.type === 'file' && e.name.endsWith('.yaml'))
    .map((e) => e.path)
}

// ─── File attachment upload ───────────────────────────────────────────────

/**
 * Upload a binary file to attachments/{entityType}/{entityId}/{filename}
 * Returns an Anexo with a raw GitHub URL for immediate use.
 */
export async function uploadAnexo(
  entityType: string,
  entityId: string,
  file: File
): Promise<Anexo> {
  const c = cfg()
  const filePath = `attachments/${entityType}/${entityId}/${file.name}`
  const result = await writeBinaryFile(c, filePath, file, `Upload ${file.name}`)
  shaCache.set(filePath, result.content.sha)
  return {
    id: crypto.randomUUID(),
    name: file.name,
    size: file.size,
    type: file.type,
    path: filePath,
    url: getRawUrl(c, filePath),
  }
}

// ─── PRESTAÇÕES ───────────────────────────────────────────────────────────

export async function loadPrestacoes(): Promise<{
  prestacoes: Prestacao[]
  despesas: Despesa[]
}> {
  const files = await listYamls('data/prestacoes')
  const docs = await Promise.all(files.map((f) => readYaml<StoredPrestacao>(f)))

  const prestacoes: Prestacao[] = []
  const despesas: Despesa[] = []

  for (const doc of docs) {
    const anexos = doc.anexo ? [storedToAnexo(doc.anexo)] : []
    prestacoes.push({ ...doc, user_id: GH_USER, anexos })
    for (const d of doc.despesas ?? []) {
      const dAnexos = (d.anexos ?? []).map(storedToAnexo)
      despesas.push({ ...d, user_id: GH_USER, prestacao_id: doc.id, anexos: dAnexos })
    }
  }

  return { prestacoes, despesas }
}

export async function savePrestacaoFile(
  prestacao: Prestacao,
  allDespesas: Despesa[]
): Promise<void> {
  const myDespesas = allDespesas.filter((d) => d.prestacao_id === prestacao.id)
  const doc: StoredPrestacao = {
    id: prestacao.id,
    titulo: prestacao.titulo,
    numero_processo: prestacao.numero_processo,
    numero_edital: prestacao.numero_edital,
    nome_edital: prestacao.nome_edital,
    agencia_fomento: prestacao.agencia_fomento,
    vigencia_inicio: prestacao.vigencia_inicio,
    vigencia_fim: prestacao.vigencia_fim,
    total_recursos: prestacao.total_recursos,
    created_at: prestacao.created_at,
    updated_at: new Date().toISOString(),
    anexo: prestacao.anexos?.[0] ? anexoToStored(prestacao.anexos[0]) : undefined,
    despesas: myDespesas.map((d) => ({
      id: d.id,
      descricao: d.descricao,
      data: d.data,
      valor: d.valor,
      numero_nota_fiscal: d.numero_nota_fiscal,
      prestador_servico: d.prestador_servico,
      created_at: d.created_at,
      anexos: (d.anexos ?? []).map(anexoToStored),
    })),
  }
  await writeYaml(`data/prestacoes/${prestacao.id}.yaml`, doc, `Update prestacao ${prestacao.id}`)
}

export async function deletePrestacaoFile(id: string): Promise<void> {
  await deleteYaml(`data/prestacoes/${id}.yaml`, `Delete prestacao ${id}`)
}

// ─── DISCURSOS ────────────────────────────────────────────────────────────

export async function loadDiscursos(): Promise<Discurso[]> {
  const files = await listYamls('data/discursos')
  const docs = await Promise.all(files.map((f) => readYaml<Omit<Discurso, 'user_id'>>(f)))
  return docs.map((d) => ({ ...d, user_id: GH_USER }))
}

export async function saveDiscurso(d: Discurso): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user_id: _u, ...stored } = d
  await writeYaml(`data/discursos/${d.id}.yaml`, stored, `Update discurso ${d.id}`)
}

export async function deleteDiscurso(id: string): Promise<void> {
  await deleteYaml(`data/discursos/${id}.yaml`, `Delete discurso ${id}`)
}

// ─── PROJETOS ─────────────────────────────────────────────────────────────

export async function loadProjetos(): Promise<ProjetoFinanciado[]> {
  const files = await listYamls('data/projetos')
  const docs = await Promise.all(
    files.map((f) => readYaml<Omit<ProjetoFinanciado, 'user_id'>>(f))
  )
  return docs.map((p) => ({ ...p, user_id: GH_USER }))
}

export async function saveProjeto(p: ProjetoFinanciado): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user_id: _u, ...stored } = p
  await writeYaml(`data/projetos/${p.id}.yaml`, stored, `Update projeto ${p.id}`)
}

export async function deleteProjeto(id: string): Promise<void> {
  await deleteYaml(`data/projetos/${id}.yaml`, `Delete projeto ${id}`)
}

// ─── ORIENTAÇÕES ──────────────────────────────────────────────────────────

export async function loadOrientacoes(): Promise<{
  orientacoes: Orientacao[]
  tarefas: Tarefa[]
}> {
  const files = await listYamls('data/orientacoes')
  const docs = await Promise.all(files.map((f) => readYaml<StoredOrientacao>(f)))

  const orientacoes: Orientacao[] = []
  const tarefas: Tarefa[] = []

  for (const doc of docs) {
    const projeto_original = doc.projeto_original
      ? storedToAnexo(doc.projeto_original)
      : undefined
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tarefas: _t, ...rest } = doc
    orientacoes.push({ ...rest, user_id: GH_USER, projeto_original })
    for (const t of doc.tarefas ?? []) {
      tarefas.push({ ...t, user_id: GH_USER, orientacao_id: doc.id })
    }
  }

  return { orientacoes, tarefas }
}

export async function saveOrientacaoFile(
  orientacao: Orientacao,
  allTarefas: Tarefa[]
): Promise<void> {
  const myTarefas = allTarefas.filter((t) => t.orientacao_id === orientacao.id)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user_id: _u, projeto_original, ...rest } = orientacao
  const doc: StoredOrientacao = {
    ...rest,
    updated_at: new Date().toISOString(),
    projeto_original: projeto_original ? anexoToStored(projeto_original) : undefined,
    tarefas: myTarefas.map((t) => ({
      id: t.id,
      descricao: t.descricao,
      concluida: t.concluida,
      created_at: t.created_at,
    })),
  }
  await writeYaml(
    `data/orientacoes/${orientacao.id}.yaml`,
    doc,
    `Update orientacao ${orientacao.id}`
  )
}

export async function deleteOrientacaoFile(id: string): Promise<void> {
  await deleteYaml(`data/orientacoes/${id}.yaml`, `Delete orientacao ${id}`)
}

// ─── PRODUÇÃO ─────────────────────────────────────────────────────────────

export async function loadProducao(): Promise<Publicacao[]> {
  const files = await listYamls('data/producao')
  const docs = await Promise.all(files.map((f) => readYaml<Omit<Publicacao, 'user_id'>>(f)))
  return docs.map((p) => ({ ...p, user_id: GH_USER }))
}

export async function savePublicacao(p: Publicacao): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user_id: _u, ...stored } = p
  await writeYaml(`data/producao/${p.id}.yaml`, stored, `Update producao ${p.id}`)
}

export async function deletePublicacao(id: string): Promise<void> {
  await deleteYaml(`data/producao/${id}.yaml`, `Delete producao ${id}`)
}

// ─── SUBMISSÕES ───────────────────────────────────────────────────────────

export async function loadSubmissoes(): Promise<{
  submissoes: Submissao[]
  eventos: SubmissaoEvento[]
}> {
  const files = await listYamls('data/submissoes')
  const docs = await Promise.all(files.map((f) => readYaml<StoredSubmissao>(f)))

  const submissoes: Submissao[] = []
  const eventos: SubmissaoEvento[] = []

  for (const doc of docs) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { eventos: _e, ...rest } = doc
    submissoes.push({ ...rest, user_id: GH_USER })
    for (const e of doc.eventos ?? []) {
      eventos.push({ ...e, user_id: GH_USER, submissao_id: doc.id })
    }
  }

  return { submissoes, eventos }
}

export async function saveSubmissaoFile(
  submissao: Submissao,
  allEventos: SubmissaoEvento[]
): Promise<void> {
  const myEventos = allEventos.filter((e) => e.submissao_id === submissao.id)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user_id: _u, ...rest } = submissao
  const doc: StoredSubmissao = {
    ...rest,
    updated_at: new Date().toISOString(),
    eventos: myEventos.map((e) => ({
      id: e.id,
      tipo: e.tipo,
      descricao: e.descricao,
      data: e.data,
      revista: e.revista,
      created_at: e.created_at,
    })),
  }
  await writeYaml(
    `data/submissoes/${submissao.id}.yaml`,
    doc,
    `Update submissao ${submissao.id}`
  )
}

export async function deleteSubmissaoFile(id: string): Promise<void> {
  await deleteYaml(`data/submissoes/${id}.yaml`, `Delete submissao ${id}`)
}
