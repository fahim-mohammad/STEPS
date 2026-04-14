'use client'

import { useRouter } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'

type Props = {
  icon: any
  title: string
  subtitle?: string
  buttonLabel: string
  buttonHref?: string
  buttonOnClickAction?: () => void

  /** NEW */
  loading?: boolean
  disabled?: boolean
}

export function DashboardCard({
  icon: Icon,
  title,
  subtitle,
  buttonLabel,
  buttonHref,
  buttonOnClickAction,
  loading = false,
  disabled = false,
}: Props) {
  const router = useRouter()

  const handleClick = () => {
    if (loading || disabled) return

    console.log('Clicked card:', { buttonHref, hasAction: !!buttonOnClickAction })

    if (buttonOnClickAction) {
      buttonOnClickAction()
      return
    }

    if (buttonHref) {
      router.push(buttonHref)
    }
  }

  return (
    <div
      className={[
        // ✅ glass UI (use your globals .glass-panel)
        'glass-panel relative z-10 rounded-2xl p-5',
        // ✅ smooth hover animation
        'transition-all duration-200 ease-out',
        'hover:-translate-y-0.5 hover:shadow-lg',
        // ✅ mobile friendly tap
        'active:scale-[0.99]',
        // ✅ mount animation (tw-animate-css)
        'animate-in fade-in-0 slide-in-from-bottom-2',
        (loading || disabled) ? 'opacity-80' : '',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        {Icon && <Icon className="h-5 w-5 opacity-70 shrink-0" />}
        <div className="min-w-0 flex-1">
          {loading ? (
            <>
              <Skeleton className="h-4 w-40 mb-2" />
              <Skeleton className="h-3 w-32" />
            </>
          ) : (
            <>
              <div className="font-semibold truncate">{title}</div>
              {subtitle && <div className="text-sm text-muted-foreground truncate">{subtitle}</div>}
            </>
          )}
        </div>
      </div>

      <div className="mt-4">
        {loading ? (
          <Skeleton className="h-10 w-full rounded-md" />
        ) : (
          <button
            type="button"
            onClick={handleClick}
            disabled={disabled}
            className="w-full px-4 py-2 btn-glass disabled:opacity-60"
          >
            {buttonLabel}
          </button>
        )}
      </div>
    </div>
  )
}