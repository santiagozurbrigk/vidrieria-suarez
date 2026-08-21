import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nombre, rol')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar userName={profile?.nombre ?? user.email ?? 'Usuario'} />
      <main className="ml-60 flex-1 overflow-y-auto">
        <div className="min-h-screen p-6">{children}</div>
      </main>
    </div>
  )
}
