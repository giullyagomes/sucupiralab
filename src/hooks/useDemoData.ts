import { useAuth } from '@/contexts/AuthContext'
import type { Prestacao, Despesa, Discurso, ProjetoFinanciado, Orientacao, Tarefa, Submissao, SubmissaoEvento } from '@/types'

const DEMO_PRESTACOES: Prestacao[] = [
  {
    id: '1', user_id: 'demo-user-id', titulo: 'Prestação de Contas — Edital Universal CNPq',
    numero_processo: '403212/2023-1', numero_edital: 'MCTI/CNPq 14/2023', nome_edital: 'Edital Universal',
    agencia_fomento: 'CNPq', vigencia_inicio: '2023-03-01', vigencia_fim: '2025-02-28',
    total_recursos: 120000, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: '2', user_id: 'demo-user-id', titulo: 'Prestação de Contas — FAPERJ Jovem Cientista',
    numero_processo: 'E-26/203.124/2022', numero_edital: 'FAPERJ JC 2022', nome_edital: 'Jovem Cientista do Nosso Estado',
    agencia_fomento: 'FAPERJ', vigencia_inicio: '2022-07-01', vigencia_fim: '2024-06-30',
    total_recursos: 75000, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
]

const DEMO_DESPESAS: Despesa[] = [
  { id: '1', user_id: 'demo-user-id', prestacao_id: '1', descricao: 'Material de laboratório', data: '2023-05-10', valor: 4500, numero_nota_fiscal: 'NF-001234', prestador_servico: 'Lab Supplies Ltda', created_at: new Date().toISOString() },
  { id: '2', user_id: 'demo-user-id', prestacao_id: '1', descricao: 'Passagem aérea — congresso', data: '2023-09-15', valor: 1200, prestador_servico: 'GOL Linhas Aéreas', created_at: new Date().toISOString() },
  { id: '3', user_id: 'demo-user-id', prestacao_id: '2', descricao: 'Bolsa pesquisador colaborador', data: '2023-01-15', valor: 3000, prestador_servico: 'Nome do Pesquisador', created_at: new Date().toISOString() },
]

const DEMO_DISCURSOS: Discurso[] = [
  { id: '1', user_id: 'demo-user-id', ano: 2024, descricao: 'Palestra "IA na Educação" — Congresso Internacional de Educação', justificativa: 'Divulgação de resultados de pesquisa em contexto internacional', links_comprovacao: 'https://congresso.edu.br/2024', repercussoes_produtos: 'Artigo derivado submetido à revista Nature Education', created_at: new Date().toISOString() },
  { id: '2', user_id: 'demo-user-id', ano: 2023, descricao: 'Mesa-redonda "Pós-graduação e Inovação" — SNPG', justificativa: 'Participação no Seminário Nacional de Pós-Graduação', created_at: new Date().toISOString() },
]

const DEMO_PROJETOS: ProjetoFinanciado[] = [
  { id: '1', user_id: 'demo-user-id', nome_projeto: 'Aprendizado de Máquina em Dados Educacionais', numero_processo: '403212/2023-1', chamadas_editais: 'MCTI/CNPq 14/2023', financiadores: 'CNPq', docentes_envolvidos: ['Prof. Dr. João Silva', 'Prof. Dra. Maria Santos'], total_aportes: 120000, vigencia_inicio: '2023-03-01', vigencia_fim: '2025-02-28', created_at: new Date().toISOString() },
  { id: '2', user_id: 'demo-user-id', nome_projeto: 'Análise de Redes Sociais Acadêmicas', financiadores: 'FAPERJ', docentes_envolvidos: ['Prof. Dr. João Silva'], total_aportes: 75000, vigencia_inicio: '2022-07-01', vigencia_fim: '2024-06-30', created_at: new Date().toISOString() },
]

const DEMO_ORIENTACOES: Orientacao[] = [
  {
    id: '1', user_id: 'demo-user-id',
    nome_orientando: 'Ana Carolina Mendes', curso: 'Doutorado',
    titulo_provisorio: 'Mineração de Dados em Plataformas de EaD',
    ano_ingresso: 2022, previsao_conclusao: '2026',
    exame_qualificacao: true,
    leituras: ['Breiman, L. (2001). Random Forests', 'Goodfellow et al. (2016). Deep Learning'],
    reunioes: [
      { id: 'r1', data: '2024-03-15', texto: 'Discutimos o capítulo 3. Revisar metodologia de avaliação.' },
      { id: 'r2', data: '2024-01-10', texto: 'Revisão da proposta inicial. Ajustar escopo da pesquisa e cronograma.' },
    ],
    links_documentos: ['https://drive.google.com/exemplo-proposta-qualificacao'],
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: '2', user_id: 'demo-user-id',
    nome_orientando: 'Bruno Rodrigues Lima', curso: 'Mestrado',
    titulo_provisorio: 'Chatbots Educacionais com LLMs',
    ano_ingresso: 2023, previsao_conclusao: '2025',
    exame_qualificacao: false,
    reunioes: [
      { id: 'r3', texto: 'Definição do tema e objetivos da pesquisa. Revisar literatura sobre LLMs.' },
    ],
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: '3', user_id: 'demo-user-id',
    nome_orientando: 'Carla Ferreira Nunes', curso: 'Iniciação Científica',
    titulo_provisorio: 'Análise de Sentimentos em Fóruns Educacionais',
    ano_ingresso: 2024,
    reunioes: [],
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
]

const DEMO_TAREFAS: Tarefa[] = [
  { id: '1', user_id: 'demo-user-id', orientacao_id: '1', descricao: 'Entregar rascunho do cap. 3', concluida: false, created_at: new Date().toISOString() },
  { id: '2', user_id: 'demo-user-id', orientacao_id: '1', descricao: 'Revisar referências bibliográficas', concluida: true, created_at: new Date().toISOString() },
  { id: '3', user_id: 'demo-user-id', orientacao_id: '2', descricao: 'Implementar protótipo do chatbot', concluida: false, created_at: new Date().toISOString() },
]

const DEMO_SUBMISSOES: Submissao[] = [
  { id: '1', user_id: 'demo-user-id', titulo_provisorio: 'ML em EaD: uma revisão sistemática', autores: ['Ana Mendes', 'João Silva'], resumo: 'Este artigo apresenta uma revisão sistemática sobre o uso de ML em plataformas de ensino a distância.', coluna: 'em_preparacao', ultima_atividade: '2024-03-10', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '2', user_id: 'demo-user-id', titulo_provisorio: 'Chatbots LLM no Ensino Superior', autores: ['Bruno Lima', 'João Silva'], coluna: 'submetido', ultima_atividade: '2024-02-15', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '3', user_id: 'demo-user-id', titulo_provisorio: 'Análise de Sentimentos em Fóruns EaD', autores: ['Carla Nunes', 'João Silva'], coluna: 'em_revisao', ultima_atividade: '2024-01-20', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '4', user_id: 'demo-user-id', titulo_provisorio: 'Predição de Evasão com Random Forests', autores: ['João Silva'], coluna: 'aceito', ultima_atividade: '2023-12-01', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
]

const DEMO_EVENTOS: SubmissaoEvento[] = [
  { id: '1', user_id: 'demo-user-id', submissao_id: '2', tipo: 'submissao', descricao: 'Artigo submetido', data: '2024-02-15', revista: 'Computers & Education', created_at: new Date().toISOString() },
  { id: '2', user_id: 'demo-user-id', submissao_id: '3', tipo: 'revisao', descricao: 'Rodada de revisão iniciada', data: '2024-01-20', revista: 'RBCA', created_at: new Date().toISOString() },
]

export function useDemoData() {
  const { isDemoMode } = useAuth()
  return {
    isDemoMode,
    prestacoes: DEMO_PRESTACOES,
    despesas: DEMO_DESPESAS,
    discursos: DEMO_DISCURSOS,
    projetos: DEMO_PROJETOS,
    orientacoes: DEMO_ORIENTACOES,
    tarefas: DEMO_TAREFAS,
    submissoes: DEMO_SUBMISSOES,
    eventos: DEMO_EVENTOS,
  }
}
