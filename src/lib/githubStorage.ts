// src/lib/githubStorage.ts

import { api } from './apiClient'

import type {
  ProjetoFinanciado,
  Discurso,
  Internacionalizacao,
  Prestacao,
  Orientacao,
  Publicacao,
  Nucleacao,
} from '@/types'

/* ───── PROJETOS ───── */

export const loadProjetos = () =>
  api<ProjetoFinanciado[]>('/projetos')

export const saveProjeto = (p: ProjetoFinanciado) =>
  api(`/projetos${p.id ? `/${p.id}` : ''}`, {
    method: p.id ? 'PUT' : 'POST',
    body: JSON.stringify(p),
  })

export const deleteProjeto = (id: string) =>
  api(`/projetos/${id}`, { method: 'DELETE' })


/* ───── DISCURSOS ───── */

export const loadDiscursos = () =>
  api<Discurso[]>('/discursos')

export const saveDiscurso = (d: Discurso) =>
  api(`/discursos${d.id ? `/${d.id}` : ''}`, {
    method: d.id ? 'PUT' : 'POST',
    body: JSON.stringify(d),
  })

export const deleteDiscurso = (id: string) =>
  api(`/discursos/${id}`, { method: 'DELETE' })


/* ───── INTERNACIONALIZAÇÃO ───── */

export const loadInternacionalizacoes = () =>
  api<Internacionalizacao[]>('/internacionalizacoes')

export const saveInternacionalizacao = (i: Internacionalizacao) =>
  api(`/internacionalizacoes${i.id ? `/${i.id}` : ''}`, {
    method: i.id ? 'PUT' : 'POST',
    body: JSON.stringify(i),
  })

export const deleteInternacionalizacao = (id: string) =>
  api(`/internacionalizacoes/${id}`, { method: 'DELETE' })


/* ───── PRESTAÇÕES (placeholder por enquanto) ───── */

export const loadPrestacoes = () =>
  api<Prestacao[]>('/prestacoes')

export const savePrestacaoFile = (p: Prestacao) =>
  api(`/prestacoes${p.id ? `/${p.id}` : ''}`, {
    method: p.id ? 'PUT' : 'POST',
    body: JSON.stringify(p),
  })

export const deletePrestacaoFile = (id: string) =>
  api(`/prestacoes/${id}`, { method: 'DELETE' })


export async function uploadAnexo(file: File) {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch('http://localhost:8080/api/anexos/upload', {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    throw new Error('Erro ao enviar arquivo')
  }

  const url = await res.text()

  return {
    id: crypto.randomUUID(),
    name: file.name,
    size: file.size,
    type: file.type,
    url,
  }
}



/* ───── ORIENTAÇÕES ───── */

export const loadOrientacoes = () =>
  api<Orientacao[]>('/orientacoes')

export const saveOrientacaoFile = (o: Orientacao) =>
  api(`/orientacoes${o.id ? `/${o.id}` : ''}`, {
    method: o.id ? 'PUT' : 'POST',
    body: JSON.stringify(o),
  })

export const deleteOrientacaoFile = (id: string) =>
  api(`/orientacoes/${id}`, { method: 'DELETE' })


/* ───── PRODUÇÃO ───── */

export const loadProducao = () =>
  api<Publicacao[]>('/producao')

export const savePublicacao = (p: Publicacao) =>
  api(`/producao${p.id ? `/${p.id}` : ''}`, {
    method: p.id ? 'PUT' : 'POST',
    body: JSON.stringify(p),
  })

export const deletePublicacao = (id: string) =>
  api(`/producao/${id}`, { method: 'DELETE' })


/* ───── NUCLEAÇÃO ───── */

export const loadNucleacoes = () =>
  api<Nucleacao[]>('/nucleacoes')

export const saveNucleacao = (n: Nucleacao) =>
  api(`/nucleacoes${n.id ? `/${n.id}` : ''}`, {
    method: n.id ? 'PUT' : 'POST',
    body: JSON.stringify(n),
  })

export const deleteNucleacao = (id: string) =>
  api(`/nucleacoes/${id}`, { method: 'DELETE' })