import type { Dispatch, SetStateAction } from 'react'
import type {
  Repo,
  TerminalQuickCommand,
  TerminalQuickCommandScope
} from '../../../../shared/types'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import RepoBadgeLabel from '@/components/repo/RepoBadgeLabel'

type TerminalQuickCommandScopeFieldProps = {
  repos: Pick<Repo, 'id' | 'displayName' | 'path' | 'badgeColor'>[]
  selectedScope: TerminalQuickCommandScope
  selectedRepoId: string
  selectedRepoMissing: boolean
  setDraft: Dispatch<SetStateAction<TerminalQuickCommand>>
}

function getRepoLabel(repo: Pick<Repo, 'displayName' | 'path'>): string {
  return repo.displayName || repo.path
}

export function TerminalQuickCommandScopeField({
  repos,
  selectedScope,
  selectedRepoId,
  selectedRepoMissing,
  setDraft
}: TerminalQuickCommandScopeFieldProps): React.JSX.Element {
  return (
    <div className="space-y-2">
      <Label>범위</Label>
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup
          type="single"
          value={selectedScope.type}
          onValueChange={(value) => {
            if (value === 'global') {
              setDraft((current) => ({ ...current, scope: { type: 'global' } }))
            }
            if (value === 'repo' && repos[0] && selectedScope.type !== 'repo') {
              setDraft((current) => ({
                ...current,
                scope: { type: 'repo', repoId: repos[0].id }
              }))
            }
          }}
          className="justify-start"
        >
          <ToggleGroupItem value="global">전역</ToggleGroupItem>
          <ToggleGroupItem value="repo" disabled={repos.length === 0}>
            프로젝트
          </ToggleGroupItem>
        </ToggleGroup>
        {selectedScope.type === 'repo' && repos.length > 0 ? (
          <div className="space-y-1">
            <Select
              value={selectedRepoId}
              onValueChange={(repoId) =>
                setDraft((current) => ({ ...current, scope: { type: 'repo', repoId } }))
              }
            >
              <SelectTrigger size="sm" className="min-w-48">
                <SelectValue
                  placeholder={selectedRepoMissing ? '목록에 없는 프로젝트' : '프로젝트 선택'}
                />
              </SelectTrigger>
              <SelectContent>
                {repos.map((repo) => (
                  <SelectItem key={repo.id} value={repo.id}>
                    <RepoBadgeLabel
                      name={getRepoLabel(repo)}
                      color={repo.badgeColor}
                      className="max-w-full"
                    />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedRepoMissing ? (
              <p className="max-w-48 text-xs text-muted-foreground">
                저장하면 다른 프로젝트를 선택하기 전까지 기존 프로젝트 범위를 유지합니다.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
