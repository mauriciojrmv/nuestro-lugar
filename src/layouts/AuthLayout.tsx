import type { ReactNode } from 'react'
import { PlaceMark } from '@/components/ui/TabIcons'

/** Quiet, centered frame for sign-in, sign-up and onboarding. */
export function AuthLayout({ title, subtitle, children, footer }: { title: ReactNode; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col px-6 pt-safe pb-safe">
      <main className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">
        <div className="mb-10 animate-rise">
          <PlaceMark className="mb-8 size-14 text-accent" />
          <h1 className="text-[34px] leading-[1.08] font-bold tracking-[-0.03em] text-balance">{title}</h1>
          {subtitle && <p className="mt-3 text-[17px] leading-snug text-pretty text-muted">{subtitle}</p>}
        </div>
        <div className="animate-rise [animation-delay:80ms]">{children}</div>
      </main>
      {footer && <footer className="mx-auto w-full max-w-[400px] pb-6 text-center text-[15px] text-muted">{footer}</footer>}
    </div>
  )
}
