/* eslint-disable max-lines -- Why: notification settings keeps delivery toggles, system test feedback, and sound selection on one settings merge path. */
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { GlobalSettings } from '../../../../shared/types'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Separator } from '../ui/separator'
import { Slider } from '../ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue
} from '../ui/select'
import { BellRing, Bot, FileAudio, Siren, Upload, Volume2 } from 'lucide-react'
import { getNotificationSoundOptions } from '@/components/notification-sound-options'
import { useMountedRef } from '@/hooks/useMountedRef'
import { useAppStore } from '@/store'
export { NOTIFICATIONS_PANE_SEARCH_ENTRIES } from './notifications-search'

type NotificationsPaneProps = {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void | Promise<void>
}

const CHOOSE_CUSTOM_SOUND_VALUE = 'choose-custom-file'

type NotificationSoundSelectValue =
  | GlobalSettings['notifications']['customSoundId']
  | typeof CHOOSE_CUSTOM_SOUND_VALUE

function isNotificationSoundId(
  value: NotificationSoundSelectValue
): value is GlobalSettings['notifications']['customSoundId'] {
  return value !== CHOOSE_CUSTOM_SOUND_VALUE
}

type SystemNotificationSettingsCopy = {
  failureTitle: string
  failureDescription: string
}

type NotificationVolumeDraftState = {
  sourceVolume: number
  draft: number
}

export function createNotificationVolumeDraftState(
  sourceVolume: number
): NotificationVolumeDraftState {
  return {
    sourceVolume,
    draft: sourceVolume
  }
}

export function resolveNotificationVolumeDraftState(
  state: NotificationVolumeDraftState,
  sourceVolume: number
): NotificationVolumeDraftState {
  return state.sourceVolume === sourceVolume
    ? state
    : createNotificationVolumeDraftState(sourceVolume)
}

function getSystemNotificationSettingsCopy(
  platform: NodeJS.Platform
): SystemNotificationSettingsCopy | null {
  if (platform === 'darwin') {
    return {
      failureTitle: 'macOS가 알림을 표시하지 않았습니다',
      failureDescription: '시스템 설정에서 Korca의 알림 허용을 켜세요.'
    }
  }

  if (platform === 'win32') {
    return {
      failureTitle: 'Windows가 알림을 표시하지 않았습니다',
      failureDescription: 'Windows 설정에서 Korca의 알림을 켜세요.'
    }
  }

  return null
}

export async function sendNotificationSettingsTestNotification(
  notificationSettings: GlobalSettings['notifications'],
  volumeDraft: number
): Promise<void> {
  const permissionStatus = await window.api.notifications.getPermissionStatus()
  if (!permissionStatus.supported) {
    toast.error('이 시스템에서는 알림을 지원하지 않습니다')
    return
  }

  const result = await window.api.notifications.dispatch({
    source: 'test',
    requireDisplayConfirmation: true
  })
  if (result.delivered) {
    // Why: the Test button must always play through, even if the user clicks
    // it twice in quick succession — the in-flight dedupe is for incidental
    // bursts of real notifications, not for an explicit user action.
    const soundResult =
      notificationSettings.customSoundId !== 'system'
        ? await window.api.notifications.playSound({
            force: true,
            volume: volumeDraft
          })
        : null
    if (notificationSettings.customSoundId !== 'system' && soundResult && !soundResult.played) {
      toast.error('사용자 지정 알림음을 재생하지 못했습니다')
      return
    }
    const settingsCopy = getSystemNotificationSettingsCopy(permissionStatus.platform)
    if (permissionStatus.platform === 'darwin' && settingsCopy) {
      // Why: Electron's native 'show' event can fire even when macOS silently
      // drops the banner because the per-app Allow notifications switch is off.
      toast.message('테스트 알림을 요청했습니다', {
        description: 'macOS 배너가 보이지 않으면 시스템 설정에서 Korca의 알림 허용을 켜세요.',
        action: {
          label: '설정 열기',
          onClick: () => {
            void window.api.notifications.openSystemSettings()
          }
        }
      })
      return
    }
    toast.success('테스트 알림을 보냈습니다')
    return
  }

  if (result.reason === 'not-displayed') {
    const settingsCopy = getSystemNotificationSettingsCopy(permissionStatus.platform)
    if (settingsCopy) {
      toast.error(settingsCopy.failureTitle, {
        description: settingsCopy.failureDescription,
        action: {
          label: '설정 열기',
          onClick: () => {
            void window.api.notifications.openSystemSettings()
          }
        }
      })
    } else {
      toast.error('시스템이 알림을 표시하지 않았습니다', {
        description: 'Korca의 데스크톱 알림 설정을 확인하세요.'
      })
    }
    return
  }

  toast.error(
    result.reason === 'disabled'
      ? '알림이 꺼져 있습니다'
      : '테스트 알림이 전달되지 않았습니다'
  )
}

export function NotificationsPane({
  settings,
  updateSettings
}: NotificationsPaneProps): React.JSX.Element {
  const notificationSettings = settings.notifications
  const notificationSettingsRef = useRef(notificationSettings)
  const mountedRef = useMountedRef()
  const [isPickingSound, setIsPickingSound] = useState(false)

  const updateNotificationSettings = async (
    updates: Partial<GlobalSettings['notifications']>
  ): Promise<void> => {
    const nextNotifications = {
      ...notificationSettingsRef.current,
      ...updates
    }
    notificationSettingsRef.current = nextNotifications
    await updateSettings({
      notifications: {
        ...nextNotifications
      }
    })
  }

  useEffect(() => {
    notificationSettingsRef.current = notificationSettings
  }, [notificationSettings])

  // Why: keep dragging local and persist only on Radix's commit event. That
  // avoids IPC on every tick without a debounce timer that can race settings updates.
  const [volumeDraftState, setVolumeDraftState] = useState(() =>
    createNotificationVolumeDraftState(notificationSettings.customSoundVolume)
  )
  const resolvedVolumeDraftState = resolveNotificationVolumeDraftState(
    volumeDraftState,
    notificationSettings.customSoundVolume
  )
  if (resolvedVolumeDraftState !== volumeDraftState) {
    // Why: external settings writes should update the slider before paint, but
    // unrelated notification toggles should not restart an in-progress drag.
    setVolumeDraftState(resolvedVolumeDraftState)
  }
  const volumeDraft = resolvedVolumeDraftState.draft
  const setVolumeDraft = (value: number): void => {
    setVolumeDraftState((current) => ({
      ...resolveNotificationVolumeDraftState(current, notificationSettings.customSoundVolume),
      draft: value
    }))
  }

  const handleVolumeCommit = (value: number): void => {
    if (notificationSettingsRef.current.customSoundVolume !== value) {
      void updateNotificationSettings({ customSoundVolume: value })
    }
  }

  const handleSendTestNotification = async (): Promise<void> => {
    useAppStore.getState().recordFeatureInteraction('notifications')
    await sendNotificationSettingsTestNotification(notificationSettings, volumeDraft)
  }

  const previewSound = async (
    customSoundId: GlobalSettings['notifications']['customSoundId']
  ): Promise<void> => {
    if (customSoundId === 'system') {
      return
    }
    const result = await window.api.notifications.playSound({
      force: true,
      volume: volumeDraft
    })
    if (!result.played) {
      toast.error('알림음을 재생하지 못했습니다')
    }
  }

  const handleChooseCustomSound = async (): Promise<void> => {
    setIsPickingSound(true)
    try {
      const soundPath = await window.api.shell.pickAudio()
      if (soundPath) {
        await updateNotificationSettings({ customSoundId: 'custom', customSoundPath: soundPath })
        await previewSound('custom')
      }
    } finally {
      if (mountedRef.current) {
        setIsPickingSound(false)
      }
    }
  }

  const handleSoundSelect = async (value: NotificationSoundSelectValue): Promise<void> => {
    if (!isNotificationSoundId(value)) {
      await handleChooseCustomSound()
      return
    }
    await updateNotificationSettings({ customSoundId: value })
    await previewSound(value)
  }

  const selectedSoundId = notificationSettings.customSoundId
  const soundOptions = getNotificationSoundOptions(notificationSettings.customSoundPath)

  return (
    <div className="space-y-1">
      <SettingToggle
        label="알림 켜기"
        description="백그라운드 이벤트를 위한 시스템 알림입니다."
        checked={notificationSettings.enabled}
        onToggle={() => {
          if (!notificationSettings.enabled) {
            useAppStore.getState().recordFeatureInteraction('notifications')
          }
          void updateNotificationSettings({ enabled: !notificationSettings.enabled })
        }}
      />

      <Separator />

      <SettingToggle
        icon={<Bot className="size-4" />}
        label="에이전트 작업 완료"
        description="코딩 에이전트가 끝나고 대기 상태가 됩니다."
        checked={notificationSettings.agentTaskComplete}
        disabled={!notificationSettings.enabled}
        onToggle={() =>
          void updateNotificationSettings({
            agentTaskComplete: !notificationSettings.agentTaskComplete
          })
        }
      />

      <SettingToggle
        icon={<Siren className="size-4" />}
        label="터미널 벨"
        description="백그라운드 터미널이 벨 문자를 내보냅니다."
        checked={notificationSettings.terminalBell}
        disabled={!notificationSettings.enabled}
        onToggle={() =>
          void updateNotificationSettings({
            terminalBell: !notificationSettings.terminalBell
          })
        }
      />

      <Separator />

      <div className="space-y-2 py-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <FileAudio className="size-4" />
            <Label>알림음</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            데스크톱 알림이 도착했을 때 Korca가 재생할 알림음을 고르세요.
          </p>
        </div>
        <Select
          value={selectedSoundId}
          disabled={!notificationSettings.enabled || isPickingSound}
          onValueChange={(value) => void handleSoundSelect(value as NotificationSoundSelectValue)}
        >
          <SelectTrigger className="w-full max-w-[360px]" size="sm">
            <SelectValue placeholder="알림음을 선택하세요" />
          </SelectTrigger>
          <SelectContent align="start" className="w-[--radix-select-trigger-width]">
            {soundOptions.map((option) => {
              const OptionIcon = option.icon
              return (
                <SelectItem key={option.id} value={option.id}>
                  <OptionIcon className="size-4" />
                  <span className="truncate">{option.title}</span>
                </SelectItem>
              )
            })}
            <SelectSeparator />
            <SelectItem value={CHOOSE_CUSTOM_SOUND_VALUE}>
              <Upload className="size-4" />
              <span>
                {notificationSettings.customSoundPath ? '사용자 파일 변경' : '사용자 파일 선택'}
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
        {notificationSettings.customSoundPath ? (
          <p
            className="truncate font-mono text-[11px] text-muted-foreground"
            title={notificationSettings.customSoundPath}
          >
            사용자 지정: {notificationSettings.customSoundPath}
          </p>
        ) : null}
        {selectedSoundId !== 'system' ? (
          <div className="flex items-center gap-3 pt-1">
            <Volume2 className="size-4 text-muted-foreground" />
            <Slider
              value={[volumeDraft]}
              min={0}
              max={100}
              step={5}
              disabled={!notificationSettings.enabled}
              onValueChange={([value]) => setVolumeDraft(value)}
              onValueCommit={([value]) => handleVolumeCommit(value)}
              className="flex-1"
              aria-label="알림음 볼륨"
            />
            <span className="w-10 text-right font-mono text-xs tabular-nums text-muted-foreground">
              {volumeDraft}%
            </span>
          </div>
        ) : null}
      </div>

      <Separator />

      <SettingToggle
        label="집중 중에는 억제"
        description="알림을 유발한 worktree가 이미 보이는 경우 알림을 건너뜁니다."
        checked={notificationSettings.suppressWhenFocused}
        disabled={!notificationSettings.enabled}
        onToggle={() =>
          void updateNotificationSettings({
            suppressWhenFocused: !notificationSettings.suppressWhenFocused
          })
        }
      />

      <div className="flex flex-wrap items-center gap-2 pt-3">
        <Button
          variant="outline"
          size="sm"
          disabled={!notificationSettings.enabled}
          onClick={() => void handleSendTestNotification()}
          className="gap-2"
        >
          <BellRing className="size-3.5" />
          테스트 알림 보내기
        </Button>
      </div>
    </div>
  )
}

export type SettingToggleProps = {
  label: string
  description: string
  checked: boolean
  onToggle: () => void
  disabled?: boolean
  icon?: ReactNode
}

export function SettingToggle({
  label,
  description,
  checked,
  onToggle,
  disabled = false,
  icon
}: SettingToggleProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          {icon}
          <Label>{label}</Label>
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={onToggle}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent transition-colors ${
          checked ? 'bg-foreground' : 'bg-muted-foreground/30'
        } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
      >
        <span
          className={`pointer-events-none block size-3.5 rounded-full bg-background shadow-sm transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}
