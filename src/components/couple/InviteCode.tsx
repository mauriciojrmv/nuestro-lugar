import { useState } from 'react'
import { Check, Copy, Share } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

/** The code, big and legible, with copy / share. */
export function InviteCode({ code, compact }: { code: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false)
  const canShare = typeof navigator.share === 'function'

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard blocked: the code stays selectable on screen.
    }
  }

  const share = () =>
    navigator
      .share({ text: `Nuestro Lugar: este es nuestro código para unirte → ${code}` })
      .catch(() => undefined)

  return (
    <div>
      <p
        className={cn(
          'font-mono font-semibold tracking-[0.14em] tabular-nums select-all',
          compact ? 'text-[26px]' : 'text-[40px] leading-none',
        )}
        aria-label={`Código ${code.split('').join(' ')}`}
      >
        {code}
      </p>
      <div className="mt-5 flex gap-2">
        <Button variant="secondary" onClick={copy} icon={copied ? <Check className="size-[18px]" /> : <Copy className="size-[18px]" />}>
          {copied ? 'Copiado' : 'Copiar'}
        </Button>
        {canShare && (
          <Button variant="secondary" onClick={share} icon={<Share className="size-[18px]" />}>
            Compartir
          </Button>
        )}
      </div>
    </div>
  )
}
