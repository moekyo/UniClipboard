import { Info } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { clearStaleAdmission } from '@/api/daemon/setupV2'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { createLogger } from '@/lib/logger'

const log = createLogger('stale-admission-recovery')

/**
 * Recovery action for the "stale admission" failure mode: an interrupted
 * pairing (crash / blue screen) leaves a durable "admission in progress"
 * record that blocks every later pairing attempt with "failed to join
 * space" until it is cleared. Runs the lightweight
 * `/v2/setup/clear-stale-admission` operation — clears only the pending
 * admission attempts and preserves the space, its history and members.
 *
 * The info popover explains the action (mirrors LanOnlyDisclosure: click-only
 * Popover), while the button itself stays short and uncluttered.
 */
export function StaleAdmissionRecoveryAction() {
  const { t } = useTranslation()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [outcome, setOutcome] = useState<'idle' | 'ok' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const runClear = async () => {
    setBusy(true)
    setOutcome('idle')
    setErrorMessage(null)
    try {
      await clearStaleAdmission()
      setOutcome('ok')
    } catch (err) {
      log.warn({ err }, 'clear stale admission failed')
      setOutcome('error')
      setErrorMessage(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="xs" disabled={busy} onClick={() => setConfirmOpen(true)}>
        {busy ? t('devices.staleAdmission.running') : t('devices.staleAdmission.trigger')}
      </Button>
      <Popover>
        <PopoverTrigger
          render={
            <button
              type="button"
              aria-label={t('devices.staleAdmission.infoAriaLabel')}
              aria-haspopup="dialog"
              className="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          }
        >
          <Info className="size-3.5" aria-hidden="true" />
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={8} aria-labelledby="stale-admission-info-title">
          <div className="space-y-2">
            <p id="stale-admission-info-title" className="text-sm font-medium">
              {t('devices.staleAdmission.title')}
            </p>
            <p className="text-xs text-muted-foreground leading-snug">
              {t('devices.staleAdmission.description')}
            </p>
          </div>
        </PopoverContent>
      </Popover>
      {outcome === 'ok' && (
        <span className="text-xs text-foreground">{t('devices.staleAdmission.success')}</span>
      )}
      {outcome === 'error' && (
        <span className="text-xs text-destructive">
          {t('devices.staleAdmission.failed')}
          {errorMessage ? ` (${errorMessage})` : ''}
        </span>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('devices.staleAdmission.confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('devices.staleAdmission.confirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('devices.staleAdmission.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={e => {
                e.preventDefault()
                void runClear()
              }}
            >
              {t('devices.staleAdmission.confirmAction')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
