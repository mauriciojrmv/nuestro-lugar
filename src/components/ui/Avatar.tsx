import { cn } from '@/lib/cn'
import type { Profile } from '@/types/domain'
import { initials, shortName } from '@/utils/names'
import { SignedImage } from './SignedImage'

export function Avatar({ profile, size = 28, className }: { profile: Profile | null | undefined; size?: number; className?: string }) {
  const style = { width: size, height: size }
  if (profile?.avatarPath) {
    return (
      <span style={style} className={cn('inline-block shrink-0 overflow-hidden rounded-full', className)}>
        <SignedImage path={profile.avatarPath} eager frameClassName="size-full rounded-full" alt="" />
      </span>
    )
  }
  return (
    <span
      style={{ ...style, fontSize: Math.round(size * 0.42) }}
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-full bg-accent-soft font-semibold text-accent',
        className,
      )}
      aria-hidden
    >
      {initials(profile) || '·'}
    </span>
  )
}

/** "Favi ♡ Mau" with two small overlapping avatars. */
export function CouplePair({
  first,
  second,
  size = 26,
  showNames = true,
  className,
}: {
  first: Profile | null
  second: Profile | null
  size?: number
  showNames?: boolean
  className?: string
}) {
  return (
    <div className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="flex -space-x-1.5">
        <Avatar profile={first} size={size} className="ring-2 ring-bg" />
        {second ? (
          <Avatar profile={second} size={size} className="ring-2 ring-bg" />
        ) : (
          <span
            style={{ width: size, height: size }}
            className="rounded-full border border-dashed border-muted/50 bg-bg ring-2 ring-bg"
            aria-hidden
          />
        )}
      </span>
      {showNames && (
        <span className="text-[14px] font-semibold tracking-[0.06em] text-ink-2 uppercase">
          {shortName(first)}
          {second && (
            <>
              <span className="mx-1.5 text-rose">♡</span>
              {shortName(second)}
            </>
          )}
        </span>
      )}
    </div>
  )
}
