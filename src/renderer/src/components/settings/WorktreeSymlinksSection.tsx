/* oxlint-disable react-doctor/no-adjust-state-on-prop-change -- pre-existing pattern, predates this rule */
import { useEffect, useMemo, useState } from 'react'
import { Folder, Link2, Plus, X } from 'lucide-react'
import type { Repo } from '../../../../shared/types'
import { Button } from '../ui/button'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '../ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { cn } from '@/lib/utils'
import { getFileTypeIcon } from '@/lib/file-type-icons'
import { SearchableSetting } from './SearchableSetting'
import { useAppStore } from '@/store'

type WorktreeSymlinksSectionProps = {
  repo: Repo
  updateRepo: (repoId: string, updates: Partial<Repo>) => void
}

type DirEntry = { name: string; isDirectory: boolean }

const MAX_SUGGESTIONS = 50

export function WorktreeSymlinksSection({
  repo,
  updateRepo
}: WorktreeSymlinksSectionProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [entries, setEntries] = useState<DirEntry[]>([])
  const activeRuntimeEnvironmentId = useAppStore((s) => s.settings?.activeRuntimeEnvironmentId)

  const paths = repo.symlinkPaths ?? []
  const queryTrimmed = query.trim().replace(/^\/+/, '')

  useEffect(() => {
    if (activeRuntimeEnvironmentId?.trim()) {
      setEntries([])
      return
    }
    let cancelled = false
    void window.api.fs
      .readDir({ dirPath: repo.path, connectionId: repo.connectionId ?? undefined })
      .then((list) => {
        if (cancelled) {
          return
        }
        setEntries(list.map((entry) => ({ name: entry.name, isDirectory: entry.isDirectory })))
      })
      .catch(() => {
        // Non-fatal: without entries the combobox still works as a free-text
        // input — the user can type any path and commit it.
      })
    return () => {
      cancelled = true
    }
  }, [activeRuntimeEnvironmentId, repo.path, repo.connectionId])

  const filtered = useMemo(() => {
    const q = queryTrimmed.toLowerCase()
    const base = q ? entries.filter((e) => e.name.toLowerCase().includes(q)) : entries
    return base.slice(0, MAX_SUGGESTIONS)
  }, [queryTrimmed, entries])

  const hasExactMatch = filtered.some((e) => e.name === queryTrimmed)
  const showLiteralItem = queryTrimmed.length > 0 && !hasExactMatch && !paths.includes(queryTrimmed)

  const commit = (rawName: string): void => {
    const trimmed = rawName.trim().replace(/^\/+/, '')
    if (!trimmed || paths.includes(trimmed)) {
      setQuery('')
      return
    }
    updateRepo(repo.id, { symlinkPaths: [...paths, trimmed] })
    setQuery('')
    setOpen(false)
  }

  const handleRemove = (path: string): void => {
    updateRepo(repo.id, { symlinkPaths: paths.filter((p) => p !== path) })
  }

  return (
    <SearchableSetting
      title="작업 트리 심볼릭 링크"
      description="기본 체크아웃에서 새로 만든 작업 트리로 심볼릭 링크할 경로입니다."
      keywords={[
        repo.displayName,
        'symlink',
        'symlinks',
        'worktree',
        'link',
        'shared',
        'env',
        'node_modules'
      ]}
      className="space-y-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">작업 트리 심볼릭 링크</h3>
          <p className="text-xs text-muted-foreground">
            새 작업 트리가 만들어지면 여기에 적은 각 경로가 기본 체크아웃에서 심볼릭 링크됩니다.
          </p>
        </div>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              <Plus className="size-3.5" />
              경로 추가
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 p-0">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="경로를 입력하세요(예: .env 또는 node_modules)…"
                value={query}
                onValueChange={setQuery}
              />
              <CommandList>
                <CommandEmpty>
                  일치 항목 없음. 계속 입력하면 사용자 지정 경로를 추가할 수 있습니다.
                </CommandEmpty>
                {showLiteralItem ? (
                  <CommandItem
                    value={`__literal__:${queryTrimmed}`}
                    onSelect={() => commit(queryTrimmed)}
                    className="items-center gap-2 px-3 py-2"
                  >
                    <Plus className="size-3.5 text-muted-foreground" />
                    <span className="text-xs">
                      추가{' '}
                      <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                        {queryTrimmed}
                      </code>
                    </span>
                  </CommandItem>
                ) : null}
                {filtered.map((entry) => {
                  const alreadyAdded = paths.includes(entry.name)
                  const FileIcon = getFileTypeIcon(entry.name)
                  return (
                    <CommandItem
                      key={entry.name}
                      value={entry.name}
                      disabled={alreadyAdded}
                      onSelect={() => commit(entry.name)}
                      className={cn('items-center gap-2 px-3 py-2', alreadyAdded && 'opacity-50')}
                    >
                      {entry.isDirectory ? (
                        <Folder className="size-3.5 text-muted-foreground" />
                      ) : (
                        <FileIcon className="size-3.5 text-muted-foreground" />
                      )}
                      <span className="truncate text-xs">{entry.name}</span>
                      {alreadyAdded ? (
                        <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">
                          추가됨
                        </span>
                      ) : null}
                    </CommandItem>
                  )
                })}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {paths.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-background/60 px-4 py-6 text-sm text-muted-foreground">
          이 저장소에는 구성된 심볼릭 링크 경로가 없습니다.
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-background/70 px-4 py-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/30">
              <Link2 className="size-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h4 className="text-sm font-medium">연결된 경로</h4>
                <span className="text-[11px] text-muted-foreground">
                  {paths.length === 1 ? '1개 경로' : `${paths.length}개 경로`}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {paths.map((path) => (
                  <span
                    key={path}
                    title={path}
                    className="inline-flex min-w-0 max-w-full items-center gap-1 truncate rounded-md border border-border/50 bg-muted/35 py-1 pl-2 pr-1 font-mono text-[11px] text-foreground/80"
                  >
                    <span className="truncate">{path}</span>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => handleRemove(path)}
                      aria-label={`${path} 제거`}
                      className="size-4 shrink-0 rounded-sm"
                    >
                      <X className="size-3" />
                    </Button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </SearchableSetting>
  )
}
