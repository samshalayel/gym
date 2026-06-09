import React, { useState, useEffect } from 'react'
import { WifiOffIcon, RefreshCwIcon, CheckCircleIcon } from 'lucide-react'
import useOnlineStatus from '../hooks/useOnlineStatus'
import { getOfflineQueue, syncOfflineQueue } from '../api/axios'
import { useI18n } from '../context/I18nContext'

export default function OfflineBanner() {
  const online        = useOnlineStatus()
  const { locale }    = useI18n()
  const isRtl         = locale === 'ar'
  const [queue, setQueue]   = useState([])
  const [syncing, setSyncing] = useState(false)
  const [syncDone, setSyncDone] = useState(null) // { synced, failed }

  // Refresh queue count
  useEffect(() => {
    setQueue(getOfflineQueue())
  }, [online])

  // Auto-sync when back online
  useEffect(() => {
    if (online && getOfflineQueue().length > 0) {
      handleSync()
    }
  }, [online])

  const handleSync = async () => {
    setSyncing(true)
    setSyncDone(null)
    const result = await syncOfflineQueue()
    setQueue(getOfflineQueue())
    setSyncing(false)
    setSyncDone(result)
    setTimeout(() => setSyncDone(null), 4000)
  }

  // Offline banner
  if (!online) return (
    <div style={s.offline}>
      <WifiOffIcon size={15} />
      <span>
        {isRtl ? 'أنت غير متصل بالإنترنت' : 'You are offline'}
        {queue.length > 0 && (
          <strong> · {queue.length} {isRtl ? 'عملية بانتظار الاتصال' : 'operations queued'}</strong>
        )}
      </span>
    </div>
  )

  // Sync result toast
  if (syncDone) return (
    <div style={s.synced}>
      <CheckCircleIcon size={15} />
      <span>
        {isRtl
          ? `تمت المزامنة: ${syncDone.synced} عملية${syncDone.failed ? ` · ${syncDone.failed} فشلت` : ''}`
          : `Synced: ${syncDone.synced} operations${syncDone.failed ? ` · ${syncDone.failed} failed` : ''}`}
      </span>
    </div>
  )

  // Pending queue while online
  if (queue.length > 0) return (
    <div style={s.pending}>
      <span>{isRtl ? `${queue.length} عملية غير متزامنة` : `${queue.length} unsynced`}</span>
      <button style={s.syncBtn} onClick={handleSync} disabled={syncing}>
        <RefreshCwIcon size={13} style={syncing ? { animation: 'spin 1s linear infinite' } : {}} />
        {isRtl ? 'مزامنة' : 'Sync'}
      </button>
    </div>
  )

  return null
}

const s = {
  offline: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '7px 16px', background: 'rgba(255,51,85,0.15)',
    borderBottom: '1px solid rgba(255,51,85,0.25)', color: '#ff8099',
    fontSize: 13,
  },
  synced: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '7px 16px', background: 'rgba(0,245,147,0.12)',
    borderBottom: '1px solid rgba(0,245,147,0.2)', color: '#00f593',
    fontSize: 13,
  },
  pending: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '5px 16px', background: 'rgba(255,214,10,0.10)',
    borderBottom: '1px solid rgba(255,214,10,0.2)', color: '#ffd60a',
    fontSize: 13,
  },
  syncBtn: {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '3px 10px', border: '1px solid rgba(255,214,10,0.3)',
    borderRadius: 6, background: 'rgba(255,214,10,0.1)', color: '#ffd60a',
    fontSize: 12, cursor: 'pointer', fontWeight: 600,
  },
}
