// ─── GitHub REST API client ────────────────────────────────────────────────
// All data is read/written via the GitHub Contents API using a PAT.
// Config is stored in localStorage so any user can clone + configure
// without rebuilding the project.

export interface GitHubConfig {
  token: string
  owner: string
  repo: string
  branch: string
}

// Config key is namespaced per Firebase UID so each Google-authenticated user
// can store their own GitHub credentials without affecting others.
let _configKey = 'sucupira_github_config'

/** Call this right after Firebase auth state changes to namespace config per user. */
export function setGitHubConfigKey(uid: string | null): void {
  _configKey = uid ? `sucupira_github_${uid}` : 'sucupira_github_config'
}

export function getGitHubConfig(): GitHubConfig | null {
  try {
    const raw = localStorage.getItem(_configKey)
    if (!raw) return null
    const cfg = JSON.parse(raw) as GitHubConfig
    return cfg.token && cfg.owner && cfg.repo ? cfg : null
  } catch {
    return null
  }
}

export function saveGitHubConfig(cfg: Omit<GitHubConfig, 'branch'> & { branch?: string }): void {
  localStorage.setItem(_configKey, JSON.stringify({ branch: 'main', ...cfg }))
}

export function clearGitHubConfig(): void {
  localStorage.removeItem(_configKey)
}

export function isGitHubConfigured(): boolean {
  return getGitHubConfig() !== null
}

// ─── Internal fetch helper ────────────────────────────────────────────────

async function ghFetch<T>(cfg: GitHubConfig, path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).message ?? `GitHub API error ${res.status}`)
  }
  return res.json() as Promise<T>
}

// ─── Types ────────────────────────────────────────────────────────────────

export interface GHFileContent {
  name: string
  path: string
  sha: string
  content: string
  encoding: string
}

export interface GHDirEntry {
  name: string
  path: string
  sha: string
  type: 'file' | 'dir'
}

// ─── Directory listing ────────────────────────────────────────────────────

export async function listDirectory(cfg: GitHubConfig, dirPath: string): Promise<GHDirEntry[]> {
  try {
    return await ghFetch<GHDirEntry[]>(
      cfg,
      `/repos/${cfg.owner}/${cfg.repo}/contents/${dirPath}?ref=${cfg.branch}`
    )
  } catch (err: any) {
    // 404 = folder doesn't exist yet (empty repo or first use)
    if (err.message?.includes('Not Found') || err.message?.includes('empty')) return []
    throw err
  }
}

// ─── File read ────────────────────────────────────────────────────────────

export async function readFile(cfg: GitHubConfig, filePath: string): Promise<GHFileContent> {
  return ghFetch<GHFileContent>(
    cfg,
    `/repos/${cfg.owner}/${cfg.repo}/contents/${filePath}?ref=${cfg.branch}`
  )
}

// ─── Text file write (create or update) ──────────────────────────────────

export async function writeTextFile(
  cfg: GitHubConfig,
  filePath: string,
  content: string,
  message: string,
  sha?: string
): Promise<{ content: { sha: string } }> {
  // Encode UTF-8 string → base64
  const bytes = new TextEncoder().encode(content)
  const binStr = Array.from(bytes, (b) => String.fromCodePoint(b)).join('')
  const b64 = btoa(binStr)

  const body: Record<string, string> = { message, content: b64, branch: cfg.branch }
  if (sha) body.sha = sha

  return ghFetch<{ content: { sha: string } }>(
    cfg,
    `/repos/${cfg.owner}/${cfg.repo}/contents/${filePath}`,
    { method: 'PUT', body: JSON.stringify(body) }
  )
}

// ─── Binary file write ────────────────────────────────────────────────────

export async function writeBinaryFile(
  cfg: GitHubConfig,
  filePath: string,
  file: File,
  message: string,
  sha?: string
): Promise<{ content: { sha: string; path: string } }> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const binStr = Array.from(bytes, (b) => String.fromCodePoint(b)).join('')
  const b64 = btoa(binStr)

  const body: Record<string, string> = { message, content: b64, branch: cfg.branch }
  if (sha) body.sha = sha

  return ghFetch<{ content: { sha: string; path: string } }>(
    cfg,
    `/repos/${cfg.owner}/${cfg.repo}/contents/${filePath}`,
    { method: 'PUT', body: JSON.stringify(body) }
  )
}

// ─── File delete ──────────────────────────────────────────────────────────

export async function deleteFile(
  cfg: GitHubConfig,
  filePath: string,
  sha: string,
  message: string
): Promise<void> {
  await ghFetch(cfg, `/repos/${cfg.owner}/${cfg.repo}/contents/${filePath}`, {
    method: 'DELETE',
    body: JSON.stringify({ message, sha, branch: cfg.branch }),
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Raw URL for public repos — bypasses API for reads */
export function getRawUrl(cfg: GitHubConfig, filePath: string): string {
  return `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${cfg.branch}/${filePath}`
}

/** Decode base64 content returned by the GitHub API */
export function decodeContent(content: string): string {
  const clean = content.replace(/\n/g, '')
  const binStr = atob(clean)
  const bytes = new Uint8Array(binStr.length)
  for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

/** Test whether the PAT has access to the given repo */
export async function testConnection(
  cfg: GitHubConfig
): Promise<{ ok: boolean; error?: string }> {
  try {
    await ghFetch(cfg, `/repos/${cfg.owner}/${cfg.repo}`)
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
}
