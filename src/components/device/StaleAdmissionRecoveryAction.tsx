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
import { createLogger } from '@/lib/logger'

const log = createLogger('stale-admission-recovery')

/**
 * Settings-page recovery action for the "stale admission" failure mode: an
 * interrupted pairing (crash / blue screen) leaves a durable "admission in
 * progress" record that blocks every later pairing attempt with
 * "failed to join space" until it is cleared. Runs the lightweight
 * `/v2/setup/clear-stale-admission` operation — clears only the pending
 * admission attempts and preserves the space, its history and members.
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
    <div className="flex items-center gap-2 rounded-md border border-border/50 px-3 py-2">
      <span className="min-w-0 flex-1 text-xs text-muted-foreground">
        {t('devices.staleAdmission.hint')}
      </span>
      {outcome === 'ok' && (
        <span className="text-xs text-foreground">{t('devices.staleAdmission.success')}</span>
      )}
      {outcome === 'error' && (
        <span className="text-xs text-destructive">
          {t('devices.staleAdmission.failed')}
          {errorMessage ? ` (${errorMessage})` : ''}
        </span>
      )}
      <Button variant="outline" size="xs" disabled={busy} onClick={() => setConfirmOpen(true)}>
        {busy ? t('devices.staleAdmission.running') : t('devices.staleAdmission.trigger')}
      </Button>

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
