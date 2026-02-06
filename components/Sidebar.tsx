'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { Modal } from './Modal'
import { LeadForm } from './LeadForm'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { useTheme } from './ThemeProvider'
import { useSidebar } from './SidebarProvider'
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Target,
  Activity,
  Settings,
  Plus,
  ChevronDown,
  User,
  DollarSign,
  MessageSquare,
  ChevronRight,
  Sparkles,
  BarChart3,
  Mail,
  Calendar,
  Inbox,
  Zap,
  LogOut,
  Moon,
  Sun
} from 'lucide-react'

const mainNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Inbox', href: '/inbox', icon: Inbox },
  { name: 'Leads', href: '/leads', icon: Users },
  { name: 'Deals', href: '/deals', icon: Briefcase },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
]

const secondaryNavigation = [
  { name: 'Verticals', href: '/verticals', icon: Target },
  { name: 'Aktivitäten', href: '/activities', icon: Activity },
  { name: 'Kalender', href: '/calendar', icon: Calendar },
  { name: 'Workflows', href: '/settings/workflows', icon: Zap },
  { name: 'Templates', href: '/settings/templates', icon: Mail },
]

const quickAddOptions = [
  { name: 'Neuer Lead', icon: User, action: 'lead' },
  { name: 'Neuer Deal', icon: DollarSign, action: 'deal' },
  { name: 'Aktivität', icon: MessageSquare, action: 'activity' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const { isOpen, close } = useSidebar()
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false)

  // Close sidebar on route change (mobile)
  useEffect(() => {
    close()
  }, [pathname, close])

  const handleQuickAdd = (action: string) => {
    setIsQuickAddOpen(false)
    switch (action) {
      case 'lead':
        setIsLeadModalOpen(true)
        break
      case 'deal':
        router.push('/deals')
        break
      case 'activity':
        router.push('/activities')
        break
    }
  }

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={close}
        />
      )}
      <aside className={clsx('sidebar', { open: isOpen })}>
        {/* Logo */}
        <div className="sidebar-header">
          <Link href="/" className="logo">
            <span className="logo-icon">
              <Sparkles size={20} />
            </span>
            <div className="flex flex-col">
              <span className="logo-text">Worknetic</span>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 500, letterSpacing: '0.02em' }}>
                Sales CRM
              </span>
            </div>
          </Link>
        </div>

        {/* Quick Add */}
        <div className="sidebar-section">
          <div className="relative">
            <button
              className="quick-add-btn"
              onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
            >
              <Plus size={18} strokeWidth={2} />
              <span>Erstellen</span>
              <ChevronDown
                size={16}
                className={`ml-auto transition-transform duration-200 ${isQuickAddOpen ? 'rotate-180' : ''}`}
                style={{ opacity: 0.6 }}
              />
            </button>

            {isQuickAddOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsQuickAddOpen(false)}
                />
                <div className="quick-add-dropdown">
                  {quickAddOptions.map((option) => (
                    <button
                      key={option.action}
                      className="quick-add-option"
                      onClick={() => handleQuickAdd(option.action)}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0, 122, 255, 0.15)' }}>
                        <option.icon size={16} style={{ color: '#007AFF' }} />
                      </div>
                      <span className="font-medium">{option.name}</span>
                      <ChevronRight size={14} className="ml-auto opacity-40" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="sidebar-nav">
          <div className="nav-section-label">Menü</div>
          {mainNavigation.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href))

            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx('nav-item', { active: isActive })}
              >
                <item.icon size={20} />
                <span>{item.name}</span>
              </Link>
            )
          })}

          <div className="nav-section-label" style={{ marginTop: '8px' }}>Mehr</div>
          {secondaryNavigation.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href))

            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx('nav-item', { active: isActive })}
              >
                <item.icon size={20} />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer - Settings & Logout */}
        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <Link
            href="/settings"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-all"
          >
            <Settings size={18} />
            <span className="text-sm font-medium">Einstellungen</span>
          </Link>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-all w-full"
            style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            <span className="text-sm font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <button
            onClick={async () => {
              const supabase = createSupabaseBrowser()
              await supabase.auth.signOut()
              router.push('/login')
              router.refresh()
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-[rgba(255,255,255,0.4)] hover:text-[#FF3B30] hover:bg-[rgba(255,59,48,0.08)] transition-all w-full"
            style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Abmelden</span>
          </button>
        </div>
      </aside>

      {/* Lead Modal */}
      <Modal
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
        title="Neuen Lead erstellen"
        size="lg"
      >
        <LeadForm
          onSuccess={() => setIsLeadModalOpen(false)}
          onCancel={() => setIsLeadModalOpen(false)}
        />
      </Modal>
    </>
  )
}
