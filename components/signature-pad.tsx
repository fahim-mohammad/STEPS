'use client'

import { useRef, useState } from 'react'
import Signature from '@uiw/react-signature/canvas'

type Props = {
  initialValue?: string | null
  onSave: (dataUrl: string) => Promise<void> | void
}

export default function SignaturePad({ initialValue, onSave }: Props) {
  const signatureRef = useRef<any>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    try {
      setError(null)
      setIsSaving(true)

      const instance = signatureRef.current
      if (!instance) {
        throw new Error('Signature pad not ready')
      }

      const dataUrl =
        typeof instance.toDataURL === 'function'
          ? instance.toDataURL('image/png')
          : instance.canvas?.toDataURL?.('image/png')

      if (!dataUrl || !String(dataUrl).startsWith('data:image/png')) {
        throw new Error('Invalid signature data')
      }

      await onSave(dataUrl)
    } catch (e: any) {
      setError(e?.message || 'Failed to save signature')
    } finally {
      setIsSaving(false)
    }
  }

  function handleClear() {
    const instance = signatureRef.current
    if (!instance) return

    if (typeof instance.clear === 'function') {
      instance.clear()
      return
    }

    const canvas = instance.canvas
    const ctx = canvas?.getContext?.('2d')
    if (!canvas || !ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-3">
        <div className="mb-2 text-sm font-medium text-black">Draw your signature</div>

        <div className="overflow-hidden rounded-xl border bg-white">
          <Signature ref={signatureRef} width={700} height={220} />
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg border px-4 py-2 text-sm text-black"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-lg bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'Save Signature'}
          </button>
        </div>

        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </div>

      {initialValue ? (
        <div className="rounded-xl border p-3">
          <div className="mb-2 text-sm font-medium">Current signature</div>
          <img
            src={initialValue}
            alt="Current signature"
            className="max-h-24 w-auto object-contain"
          />
        </div>
      ) : null}
    </div>
  )
}