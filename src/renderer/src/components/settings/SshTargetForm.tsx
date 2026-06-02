import { FileKey } from 'lucide-react'
import {
  DEFAULT_SSH_RELAY_GRACE_PERIOD_SECONDS,
  MAX_SSH_RELAY_GRACE_PERIOD_SECONDS,
  MIN_SSH_RELAY_GRACE_PERIOD_SECONDS
} from '../../../../shared/ssh-types'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { applyParsedSshHostInput, type EditingTarget } from './ssh-target-draft'
export { EMPTY_FORM, type EditingTarget } from './ssh-target-draft'

type SshTargetFormProps = {
  editingId: string | null
  form: EditingTarget
  onFormChange: (updater: (prev: EditingTarget) => EditingTarget) => void
  onSave: () => void
  onCancel: () => void
}

export function SshTargetForm({
  editingId,
  form,
  onFormChange,
  onSave,
  onCancel
}: SshTargetFormProps): React.JSX.Element {
  return (
    <form
      className="space-y-4 rounded-lg border border-border/50 bg-card/40 p-4"
      onSubmit={(e) => {
        e.preventDefault()
        onSave()
      }}
    >
      <p className="text-sm font-medium">{editingId ? 'SSH 대상 수정' : '새 SSH 대상'}</p>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>레이블</Label>
          <Input
            value={form.label}
            onChange={(e) => onFormChange((f) => ({ ...f, label: e.target.value }))}
            placeholder="My Server"
          />
        </div>
        <div className="space-y-1.5">
          <Label>호스트 또는 별칭 *</Label>
          <Input
            value={form.host}
            onChange={(e) => onFormChange((f) => ({ ...f, host: e.target.value }))}
            onBlur={() => onFormChange(applyParsedSshHostInput)}
            placeholder="server, deploy@server:2222, ssh://server"
          />
        </div>
        <div className="space-y-1.5">
          <Label>사용자 이름</Label>
          <Input
            value={form.username}
            onChange={(e) => onFormChange((f) => ({ ...f, username: e.target.value }))}
            placeholder="deploy"
          />
        </div>
        <div className="space-y-1.5">
          <Label>포트</Label>
          <Input
            type="number"
            value={form.port}
            onChange={(e) => onFormChange((f) => ({ ...f, port: e.target.value }))}
            placeholder="22"
            min={1}
            max={65535}
          />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <FileKey className="size-3.5" />
            개인 키 파일
          </Label>
          <Input
            value={form.identityFile}
            onChange={(e) => onFormChange((f) => ({ ...f, identityFile: e.target.value }))}
            placeholder="~/.ssh/id_ed25519 (비워 두면 SSH 에이전트 사용)"
          />
          <p className="text-[11px] text-muted-foreground">
            선택 사항입니다. 기본값으로 SSH 에이전트를 사용합니다.
          </p>
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>프록시 명령</Label>
          <Input
            value={form.proxyCommand}
            onChange={(e) => onFormChange((f) => ({ ...f, proxyCommand: e.target.value }))}
            placeholder="예: cloudflared access ssh --hostname %h"
          />
          <p className="text-[11px] text-muted-foreground">
            선택 사항입니다. 터널링에 사용합니다(예: Cloudflare Access, ProxyCommand).
          </p>
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>점프 호스트</Label>
          <Input
            value={form.jumpHost}
            onChange={(e) => onFormChange((f) => ({ ...f, jumpHost: e.target.value }))}
            placeholder="bastion.example.com"
          />
          <p className="text-[11px] text-muted-foreground">
            선택 사항입니다. ProxyJump / ssh -J와 같습니다.
          </p>
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>릴레이 유예 시간(초)</Label>
          <Input
            type={form.relayKeepAliveUntilReset ? 'text' : 'number'}
            value={form.relayKeepAliveUntilReset ? '재설정할 때까지' : form.relayGracePeriodSeconds}
            onChange={(e) =>
              onFormChange((f) => ({ ...f, relayGracePeriodSeconds: e.target.value }))
            }
            placeholder={String(DEFAULT_SSH_RELAY_GRACE_PERIOD_SECONDS)}
            min={MIN_SSH_RELAY_GRACE_PERIOD_SECONDS}
            max={MAX_SSH_RELAY_GRACE_PERIOD_SECONDS}
            disabled={form.relayKeepAliveUntilReset}
          />
          <label className="flex cursor-pointer items-start gap-2.5 py-1 text-xs">
            <input
              type="checkbox"
              className="mt-0.5 size-3.5 shrink-0 accent-foreground"
              checked={form.relayKeepAliveUntilReset}
              onChange={(e) =>
                onFormChange((f) => ({ ...f, relayKeepAliveUntilReset: e.target.checked }))
              }
            />
            <span className="space-y-0.5">
              <span className="block font-medium text-foreground">재설정할 때까지 유지</span>
              <span className="block text-muted-foreground">
                원격 터미널은 종료하거나 릴레이를 재설정할 때까지 유지됩니다.
              </span>
            </span>
          </label>
          <p className="text-[11px] text-muted-foreground">
            연결 해제 후 릴레이가 터미널을 유지하는 시간입니다. 기본값: 10800(3시간). 최대:{' '}
            {MAX_SSH_RELAY_GRACE_PERIOD_SECONDS}(7일).
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm">
          {editingId ? '변경 사항 저장' : '대상 추가'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          취소
        </Button>
      </div>
    </form>
  )
}
