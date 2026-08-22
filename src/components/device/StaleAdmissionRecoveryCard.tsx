import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { clearStaleAdmission } from '@/api/daemon/setupV2'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
 * "加入空间失败" until it is cleared. This card runs the lightweight
 * `/v2/setup/clear-stale-admission` operation — it clears only the pending
 * admission attempts and preserves the space, its history and members.
 */
export function StaleAdmissionRecoveryCard() {
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
    <div className="space-y-2 rounded-lg border border-border/60 p-4">
      <h3 className="text-sm font-semibold text-foreground">{t('devices.staleAdmission.title')}</h3>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {t('devices.staleAdmission.description')}
      </p>
      {outcome === 'ok' && (
        <Alert variant="default" className="mt-2 py-2">
          <AlertDescription className="text-xs">
            {t('devices.staleAdmission.success')}
          </AlertDescription>
        </Alert>
      )}
      {outcome === 'error' && (
        <Alert variant="destructive" className="mt-2 py-2">
          <AlertDescription className="text-xs">
            {t('devices.staleAdmission.failed')}
            {errorMessage ? ` (${errorMessage})` : ''}
          </AlertDescription>
        </Alert>
      )}
      <div className="pt-1">
        <Button variant="outline" size="xs" disabled={busy} onClick={() => setConfirmOpen(true)}>
          {busy ? t('devices.staleAdmission.running') : t('devices.staleAdmission.trigger')}
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('devices.staleAdmission.confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('devices.staleAdmission.confirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
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
