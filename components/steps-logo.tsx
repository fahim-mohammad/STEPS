export type StepsLogoVariant = 'auto' | 'light' | 'dark'

type LogoImgProps = {
  src: string
  alt: string
  width: number
  height: number
  className: string
  fallbacks: string[]
}

function LogoImg({ src, alt, width, height, className, fallbacks }: LogoImgProps) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      draggable={false}
      className={className}
      onError={(e) => {
        const target = e.currentTarget as HTMLImageElement
        const current = target.getAttribute('data-fallback-index')
        const index = current ? Number(current) : 0

        if (index < fallbacks.length) {
          target.src = fallbacks[index]
          target.setAttribute('data-fallback-index', String(index + 1))
          return
        }

        target.style.display = 'none'

        const parent = target.parentElement
        if (parent && !parent.querySelector('[data-logo-text-fallback="true"]')) {
          const fallback = document.createElement('div')
          fallback.setAttribute('data-logo-text-fallback', 'true')
          fallback.className =
            'flex items-center justify-center rounded-xl border border-border/40 bg-background/70 text-foreground font-bold'
          fallback.style.width = `${width}px`
          fallback.style.height = `${height}px`
          fallback.style.fontSize = `${Math.max(12, Math.floor(width / 4))}px`
          fallback.textContent = 'STEPS'
          parent.appendChild(fallback)
        }
      }}
    />
  )
}

export function StepsLogo({
  size = 44,
  variant = 'auto',
  onGlass = false,
  className = '',
}: {
  size?: number
  variant?: StepsLogoVariant
  onGlass?: boolean
  className?: string
}) {
  const wrapperClass = [
    'inline-flex items-center justify-center',
    onGlass ? 'rounded-2xl p-1 bg-background/25 backdrop-blur border border-white/10' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const imgClass = 'rounded-xl object-contain'

  const lightFallbacks = ['/logo-dark.png', '/icon.svg', '/assets/logo-light.jpeg']
  const darkFallbacks = ['/logo-light.jpeg', '/icon.svg', '/assets/logo-dark.png']

  const LightLogo = (
    <LogoImg
      src="/logo-light.jpeg"
      alt="STEPS"
      width={size}
      height={size}
      className={imgClass}
      fallbacks={lightFallbacks}
    />
  )

  const DarkLogo = (
    <LogoImg
      src="/logo-dark.png"
      alt="STEPS"
      width={size}
      height={size}
      className={imgClass}
      fallbacks={darkFallbacks}
    />
  )

  return (
    <div className={wrapperClass}>
      {variant === 'light' ? (
        LightLogo
      ) : variant === 'dark' ? (
        DarkLogo
      ) : (
        <>
          <div className="block dark:hidden">{LightLogo}</div>
          <div className="hidden dark:block">{DarkLogo}</div>
        </>
      )}
    </div>
  )
}