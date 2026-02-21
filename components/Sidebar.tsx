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
  BarChart3,
  Mail,
  Calendar,
  Inbox,
  Zap,
  Rocket,
  LogOut,
  Moon,
  Sun,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
} from 'lucide-react'

function WorkneticLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="17" y1="100" x2="50" y2="100" stroke="white" strokeWidth="12.5" strokeLinecap="round" opacity="0.4"/>
      <path d="M 50 100 L 71 146 L 100 54 L 129 146 L 150 100" stroke="white" strokeWidth="12.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <line x1="150" y1="100" x2="183" y2="100" stroke="white" strokeWidth="12.5" strokeLinecap="round" opacity="0.4"/>
    </svg>
  )
}

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
  { name: 'Automatisierungen', href: '/automations', icon: Rocket },
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
  const { isOpen, isCollapsed, close, toggleCollapse } = useSidebar()
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
      <aside className={clsx('sidebar', { open: isOpen, collapsed: isCollapsed })}>
        {/* Collapse Toggle Arrow — pinned to sidebar edge */}
        <button
          onClick={toggleCollapse}
          className="sidebar-edge-toggle"
          title={isCollapsed ? 'Sidebar ausklappen' : 'Sidebar einklappen'}
          aria-label={isCollapsed ? 'Sidebar ausklappen' : 'Sidebar einklappen'}
        >
          <ChevronLeft
            size={14}
            style={{
              transition: 'transform 0.25s var(--ease-out)',
              transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </button>

        {/* Logo */}
        <div className="sidebar-header">
          <Link href="/" className="logo">
            <span className="logo-icon">
              <WorkneticLogo size={22} />
            </span>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="logo-text">Worknetic</span>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Sales CRM
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Quick Add */}
        {!isCollapsed ? (
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
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(79, 70, 229, 0.15)' }}>
                          <option.icon size={16} style={{ color: '#4F46E5' }} />
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
        ) : (
          <div className="sidebar-section" style={{ padding: '8px 12px 16px' }}>
            <button
              className="quick-add-btn-collapsed"
              onClick={() => setIsLeadModalOpen(true)}
              title="Erstellen"
            >
              <Plus size={20} strokeWidth={2} />
            </button>
          </div>
        )}

        {/* Main Navigation */}
        <nav className="sidebar-nav">
          {!isCollapsed && <div className="nav-section-label">Menü</div>}
          {mainNavigation.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href))

            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx('nav-item', { active: isActive })}
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon size={20} />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            )
          })}

          {!isCollapsed && <div className="nav-section-label" style={{ marginTop: '8px' }}>Mehr</div>}
          {isCollapsed && <div style={{ height: '16px' }} />}
          {secondaryNavigation.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href))

            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx('nav-item', { active: isActive })}
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon size={20} />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          {!isCollapsed ? (
            <>
              <Link href="/settings" className="sidebar-footer-item">
                <Settings size={18} />
                <span>Einstellungen</span>
              </Link>
              <button onClick={toggleTheme} className="sidebar-footer-item">
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
              <button
                onClick={async () => {
                  const supabase = createSupabaseBrowser()
                  await supabase.auth.signOut()
                  router.push('/login')
                  router.refresh()
                }}
                className="sidebar-footer-item danger"
              >
                <LogOut size={18} />
                <span>Abmelden</span>
              </button>
            </>
          ) : (
            <>
              <Link href="/settings" className="sidebar-footer-item" title="Einstellungen">
                <Settings size={18} />
              </Link>
              <button onClick={toggleTheme} className="sidebar-footer-item" title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}>
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </>
          )}
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
