'use client'

import { Search, HelpCircle, Command, Menu } from 'lucide-react'
import { NotificationDropdown } from './NotificationDropdown'
import { useSidebar } from './SidebarProvider'

interface HeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const { toggle } = useSidebar()

  return (
    <header className="app-header">
      <div className="header-left">
        {/* Mobile hamburger */}
        <button
          onClick={toggle}
          className="mobile-menu-btn"
          aria-label="Menü öffnen"
        >
          <Menu size={22} />
        </button>
        <div>
          <h1 className="header-title">{title}</h1>
          {subtitle && <p className="header-subtitle">{subtitle}</p>}
        </div>
      </div>

      {/* Search - Opens Command Palette */}
      <div className="header-center">
        <button
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
          }}
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            background: 'var(--color-bg-secondary)',
            borderRadius: '14px',
            border: '1px solid var(--color-border)',
            padding: '12px 16px',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            cursor: 'pointer',
            textAlign: 'left',
          }}
          className="group hover:border-[var(--color-border-strong)] hover:shadow-md"
        >
          <Search size={18} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: '14px', color: 'var(--color-text-tertiary)', minWidth: '200px' }}>
            Suchen...
          </span>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              background: 'var(--color-bg)',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              flexShrink: 0
            }}
          >
            <Command size={11} style={{ color: 'var(--color-text-tertiary)' }} />
            <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-tertiary)' }}>K</span>
          </div>
        </button>
      </div>

      <div className="header-right">
        {actions}

        {/* Notification Bell with Dropdown */}
        <NotificationDropdown />

        {/* Help Button - Modern Style */}
        <button
          style={{
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: '14px',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}
          className="hover:bg-[var(--color-bg-secondary)] hover:border-[var(--color-border-strong)] hover:shadow-md"
        >
          <HelpCircle size={20} />
        </button>
      </div>
    </header>
  )
}
