'use client'

import { Search, Bell, HelpCircle, Command } from 'lucide-react'

interface HeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="header-left">
        <div>
          <h1 className="header-title">{title}</h1>
          {subtitle && <p className="header-subtitle">{subtitle}</p>}
        </div>
      </div>

      {/* Search - Modern Floating Style */}
      <div className="header-center">
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            background: 'var(--color-bg-secondary)',
            borderRadius: '14px',
            border: '1px solid var(--color-border)',
            padding: '0 16px',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}
          className="group hover:border-[var(--color-border-strong)] focus-within:border-[#007AFF] focus-within:shadow-[0_0_0_4px_rgba(0,122,255,0.1)]"
        >
          <Search size={18} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Suchen..."
            style={{
              flex: 1,
              padding: '12px',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '14px',
              color: 'var(--color-text)',
              width: '100%',
              minWidth: '200px'
            }}
          />
          {/* Keyboard Shortcut Badge */}
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
        </div>
      </div>

      <div className="header-right">
        {actions}

        {/* Notification Bell - Modern Style */}
        <button
          style={{
            position: 'relative',
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
          <Bell size={20} />
          {/* Notification Badge */}
          <span
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              width: '18px',
              height: '18px',
              background: 'linear-gradient(135deg, #FF3B30 0%, #FF453A 100%)',
              borderRadius: '9px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 700,
              color: 'white',
              boxShadow: '0 2px 6px rgba(255, 59, 48, 0.4)',
              border: '2px solid var(--color-bg)'
            }}
          >
            3
          </span>
        </button>

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
