import { AuthLayout } from '@/layouts/AuthLayout'

/** Shown only when the build has no Supabase configuration. */
export function SetupPage() {
  return (
    <AuthLayout title="Falta un paso." subtitle="La app todavía no está conectada a su base de datos.">
      <div className="rounded-[20px] bg-surface p-5 text-[15px] leading-relaxed text-ink-2">
        <p>
          Crea un archivo <code className="font-mono text-accent">.env</code> a partir de{' '}
          <code className="font-mono text-accent">.env.example</code> con:
        </p>
        <pre className="mt-3 overflow-x-auto rounded-[12px] bg-surface-2 p-3 font-mono text-[13px]">
          VITE_SUPABASE_URL=…{'\n'}VITE_SUPABASE_ANON_KEY=…
        </pre>
        <p className="mt-3 text-muted">Después reinicia el servidor. Las instrucciones completas están en el README.</p>
      </div>
    </AuthLayout>
  )
}
