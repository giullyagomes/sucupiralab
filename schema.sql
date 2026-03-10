-- ============================================================
-- SucupiraLAB — Schema SQL para Supabase
-- Execute este script no SQL Editor do seu projeto Supabase
-- ============================================================

-- Habilitar extensão UUID
create extension if not exists "pgcrypto";

-- ─── PRESTAÇÕES DE CONTAS ──────────────────────────────────

create table if not exists prestacoes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  titulo      text not null,
  numero_processo   text,
  numero_edital     text,
  nome_edital       text,
  agencia_fomento   text,
  vigencia_inicio   date,
  vigencia_fim      date,
  total_recursos    numeric,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table prestacoes enable row level security;
create policy "Users can manage their own prestacoes"
  on prestacoes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── DESPESAS ─────────────────────────────────────────────

create table if not exists despesas (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  prestacao_id    uuid not null references prestacoes(id) on delete cascade,
  descricao       text not null,
  data            date,
  valor           numeric not null default 0,
  numero_nota_fiscal  text,
  prestador_servico   text,
  created_at      timestamptz not null default now()
);

alter table despesas enable row level security;
create policy "Users can manage their own despesas"
  on despesas for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── DISCURSOS QUALIFICADOS ───────────────────────────────

create table if not exists discursos (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  ano                   int not null,
  descricao             text not null,
  justificativa         text,
  links_comprovacao     text,
  repercussoes_produtos text,
  created_at            timestamptz not null default now()
);

alter table discursos enable row level security;
create policy "Users can manage their own discursos"
  on discursos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── PROJETOS FINANCIADOS ─────────────────────────────────

create table if not exists projetos_financiados (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  nome_projeto           text not null,
  numero_processo        text,
  chamadas_editais       text,
  financiadores          text,
  instituicoes_envolvidas text,
  docentes_envolvidos    text[],
  total_aportes          numeric,
  vigencia_inicio        date,
  vigencia_fim           date,
  resumo_projeto         text,
  created_at             timestamptz not null default now()
);

alter table projetos_financiados enable row level security;
create policy "Users can manage their own projetos"
  on projetos_financiados for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── ORIENTAÇÕES ──────────────────────────────────────────

create table if not exists orientacoes (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  nome_orientando       text not null,
  curso                 text not null,
  titulo_provisorio     text,
  ano_ingresso          int,
  previsao_conclusao    text,
  exame_qualificacao    boolean default false,
  leituras              text[],
  notas_orientacao      text,
  reunioes              jsonb default '[]'::jsonb,
  links_documentos      text[],
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table orientacoes enable row level security;
create policy "Users can manage their own orientacoes"
  on orientacoes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── TAREFAS ──────────────────────────────────────────────

create table if not exists tarefas (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  orientacao_id   uuid not null references orientacoes(id) on delete cascade,
  descricao       text not null,
  concluida       boolean not null default false,
  created_at      timestamptz not null default now()
);

alter table tarefas enable row level security;
create policy "Users can manage their own tarefas"
  on tarefas for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── SUBMISSÕES ───────────────────────────────────────────

create table if not exists submissoes (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  titulo_provisorio   text not null,
  autores             text[],
  resumo              text,
  coluna              text not null default 'rascunho',
  ultima_atividade    date,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table submissoes enable row level security;
create policy "Users can manage their own submissoes"
  on submissoes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── SUBMISSÃO EVENTOS ────────────────────────────────────

create table if not exists submissao_eventos (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  submissao_id    uuid not null references submissoes(id) on delete cascade,
  tipo            text not null,
  descricao       text,
  data            date,
  revista         text,
  created_at      timestamptz not null default now()
);

alter table submissao_eventos enable row level security;
create policy "Users can manage their own submissao_eventos"
  on submissao_eventos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── PUBLICAÇÕES (Produção Científica) ───────────────────

create table if not exists publicacoes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  tipo        text not null check (tipo in ('artigo','capitulo','congresso','livro','patente','outro')),
  titulo      text not null,
  autores     text[],
  ano         int not null,
  venue       text,
  doi         text,
  qualis      text,
  citacoes    int,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table publicacoes enable row level security;
create policy "Users can manage their own publicacoes"
  on publicacoes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── TRIGGER: updated_at automático ──────────────────────

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_prestacoes_updated_at
  before update on prestacoes
  for each row execute function update_updated_at_column();

create trigger trg_orientacoes_updated_at
  before update on orientacoes
  for each row execute function update_updated_at_column();

create trigger trg_submissoes_updated_at
  before update on submissoes
  for each row execute function update_updated_at_column();

create trigger trg_publicacoes_updated_at
  before update on publicacoes
  for each row execute function update_updated_at_column();

-- ─── ÍNDICES ──────────────────────────────────────────────

create index if not exists idx_prestacoes_user_id       on prestacoes(user_id);
create index if not exists idx_despesas_user_id         on despesas(user_id);
create index if not exists idx_despesas_prestacao_id    on despesas(prestacao_id);
create index if not exists idx_discursos_user_id        on discursos(user_id);
create index if not exists idx_projetos_user_id         on projetos_financiados(user_id);
create index if not exists idx_orientacoes_user_id      on orientacoes(user_id);
create index if not exists idx_tarefas_user_id          on tarefas(user_id);
create index if not exists idx_tarefas_orientacao_id    on tarefas(orientacao_id);
create index if not exists idx_submissoes_user_id       on submissoes(user_id);
create index if not exists idx_submissao_eventos_user_id on submissao_eventos(user_id);
create index if not exists idx_submissao_eventos_submissao_id on submissao_eventos(submissao_id);
create index if not exists idx_publicacoes_user_id      on publicacoes(user_id);
