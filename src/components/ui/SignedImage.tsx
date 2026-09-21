import { useState, type CSSProperties, type ImgHTMLAttributes } from 'react'
import { ImageOff } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useInView } from '@/hooks/useInView'
import { useSignedUrl } from '@/hooks/useSignedUrl'

interface Props extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  path: string | null | undefined
  /** Load immediately instead of when scrolled near. */
  eager?: boolean
  /** Classes for the wrapper (size, radius, aspect). */
  frameClassName?: string
  frameStyle?: CSSProperties
}

/**
 * A private photo: signed on demand, only when it's about to be visible,
 * fading in once decoded over a quiet placeholder.
 */
export function SignedImage({ path, eager, frameClassName, frameStyle, className, alt = '', ...rest }: Props) {
  const [ref, inView] = useInView<HTMLDivElement>(!eager)
  const { url, failed } = useSignedUrl(path, inView)
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null)
  const [broken, setBroken] = useState(false)
  const loaded = Boolean(url && loadedUrl === url)

  return (
    <div ref={ref} style={frameStyle} className={cn('relative overflow-hidden bg-surface-2', frameClassName)}>
      {url && !broken && (
        <img
          src={url}
          alt={alt}
          crossOrigin="anonymous"
          decoding="async"
          loading={eager ? 'eager' : 'lazy'}
          draggable={false}
          onLoad={() => setLoadedUrl(url)}
          onError={() => setBroken(true)}
          className={cn(
            'size-full object-cover transition-[opacity,filter,transform] duration-500 ease-[var(--ease-soft)]',
            loaded ? 'opacity-100 blur-0' : 'scale-[1.02] opacity-0 blur-sm',
            className,
          )}
          {...rest}
        />
      )}
      {(failed || broken) && (
        <div className="absolute inset-0 grid place-items-center text-muted/60">
          <ImageOff className="size-5" strokeWidth={1.6} />
        </div>
      )}
    </div>
  )
}
