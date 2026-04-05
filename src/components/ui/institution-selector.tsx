import { useState, useRef, useEffect } from 'react'
import { X, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { INSTITUICOES_BRASILEIRAS } from '@/data/instituicoes-brasileiras'

// ─── Single-value variant (Nucleação) ─────────────────────────────────────

interface InstitutionSelectorSingleProps {
  mode: 'single'
  value: string
  onChange: (val: string) => void
  placeholder?: string
  className?: string
}

// ─── Multi-value variant (Internacionalização) ────────────────────────────

interface InstitutionSelectorMultiProps {
  mode: 'multi'
  values: string[]
  onChange: (vals: string[]) => void
  placeholder?: string
  className?: string
  pillColorClass?: string
}

type InstitutionSelectorProps =
  | InstitutionSelectorSingleProps
  | InstitutionSelectorMultiProps

export function InstitutionSelector(props: InstitutionSelectorProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  const filtered = INSTITUICOES_BRASILEIRAS.filter((inst) =>
    inst.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 10)

  const hasExactMatch = INSTITUICOES_BRASILEIRAS.some(
    (i) => i.toLowerCase() === query.trim().toLowerCase()
  )

  function selectItem(item: string) {
    if (props.mode === 'single') {
      props.onChange(item)
    } else {
      if (!props.values.includes(item)) {
        props.onChange([...props.values, item])
      }
    }
    setQuery('')
    setOpen(false)
  }

  function removeVal(idx: number) {
    if (props.mode === 'multi') {
      props.onChange(props.values.filter((_, i) => i !== idx))
    }
  }

  const pillColor =
    props.mode === 'multi'
      ? (props as InstitutionSelectorMultiProps).pillColorClass ?? 'bg-indigo-100 text-indigo-700'
      : ''

  return (
    <div ref={containerRef} className={cn('relative', props.className)}>
      {/* Pills (multi mode) */}
      {props.mode === 'multi' && props.values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {props.values.map((v, i) => (
            <span
              key={i}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                pillColor
              )}
            >
              {v}
              <button
                type="button"
                onClick={() => removeVal(i)}
                className="hover:opacity-70 transition-opacity"
                aria-label={`Remover ${v}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder={
          props.mode === 'single'
            ? props.value || props.placeholder || 'Buscar instituição...'
            : props.placeholder || 'Buscar e adicionar instituição...'
        }
        autoComplete="off"
      />
      {props.mode === 'single' && props.value && !query && (
        <p className="mt-1 text-xs text-gray-500 truncate">{props.value}</p>
      )}

      {/* Dropdown */}
      {open && query.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg max-h-60 overflow-y-auto">
          {filtered.map((inst) => (
            <button
              key={inst}
              type="button"
              onClick={() => selectItem(inst)}
              className="w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="truncate">{inst}</span>
            </button>
          ))}
          {query.trim() && !hasExactMatch && (
            <button
              type="button"
              onClick={() => selectItem(query.trim())}
              className="w-full text-left px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 font-medium border-t border-gray-100 dark:border-gray-700"
            >
              + Adicionar "{query.trim()}"
            </button>
          )}
          {filtered.length === 0 && !query.trim() && (
            <p className="px-3 py-2 text-sm text-gray-400">Nenhum resultado</p>
          )}
        </div>
      )}
    </div>
  )
}
