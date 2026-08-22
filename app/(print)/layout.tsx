import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <html lang="es">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 13px;
            color: #111;
            background: white;
            padding: 0;
          }
          @media print {
            .no-print { display: none !important; }
            @page { margin: 15mm 20mm; size: A4; }
          }
          @media screen {
            body { background: #f3f4f6; }
            .doc-wrapper { max-width: 794px; margin: 20px auto; background: white; padding: 40px; box-shadow: 0 2px 16px rgba(0,0,0,0.1); }
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
