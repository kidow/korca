import { toast } from 'sonner'
import { KORCA_BROWSER_BLANK_URL } from '../../../../shared/constants'
import { normalizeBrowserNavigationUrl } from '../../../../shared/browser-url'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { SearchableSetting } from './SearchableSetting'

type BrowserHomePageSettingProps = {
  value: string
  onChange: (value: string) => void
  onSave: (url: string | null) => void
}

export function BrowserHomePageSetting({
  value,
  onChange,
  onSave
}: BrowserHomePageSettingProps): React.JSX.Element {
  return (
    <SearchableSetting
      title="기본 홈 페이지"
      description="새 브라우저 탭을 만들 때 열릴 URL입니다. 비워 두면 빈 탭이 열립니다."
      keywords={['browser', 'home', 'homepage', 'default', 'url', 'new tab', 'blank']}
      className="flex items-start justify-between gap-4 py-2"
    >
      <div className="min-w-0 shrink space-y-0.5">
        <Label>기본 홈 페이지</Label>
        <p className="text-xs text-muted-foreground">
          새 브라우저 탭을 만들 때 열릴 URL입니다. 비워 두면 빈 탭이 열립니다.
        </p>
      </div>
      <form
        className="flex shrink-0 items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          const trimmed = value.trim()
          if (!trimmed) {
            onSave(null)
            return
          }
          const normalized = normalizeBrowserNavigationUrl(trimmed)
          if (normalized && normalized !== KORCA_BROWSER_BLANK_URL) {
            onSave(normalized)
            toast.success('홈 페이지를 저장했습니다.')
          }
        }}
      >
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="https://google.com"
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          className="h-7 w-52 text-xs"
        />
        <Button type="submit" size="sm" variant="outline" className="h-7 text-xs">
          저장
        </Button>
      </form>
    </SearchableSetting>
  )
}
