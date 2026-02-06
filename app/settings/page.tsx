import Link from 'next/link'
import { Header } from '@/components/Header'
import { Mail, Users, Bell, Shield, Palette, Database, Zap, ChevronRight } from 'lucide-react'

const settingsItems = [
  {
    name: 'E-Mail Templates',
    description: 'Vorlagen für Outreach, Follow-ups und Proposals',
    href: '/settings/templates',
    icon: Mail,
    color: '#007AFF'
  },
  {
    name: 'Automatisierung',
    description: 'Workflows und Regeln für automatische Aktionen',
    href: '/settings/workflows',
    icon: Zap,
    color: '#FF9500'
  },
  {
    name: 'Team & Benutzer',
    description: 'Benutzer verwalten und Rollen zuweisen',
    href: '/settings',
    icon: Users,
    color: '#AF52DE',
    badge: 'Bald'
  },
  {
    name: 'Benachrichtigungen',
    description: 'E-Mail und Push-Benachrichtigungen konfigurieren',
    href: '/settings',
    icon: Bell,
    color: '#FF9500',
    badge: 'Bald'
  },
  {
    name: 'Sicherheit',
    description: 'Passwort, 2FA und API-Schlüssel',
    href: '/settings',
    icon: Shield,
    color: '#34C759',
    badge: 'Bald'
  },
  {
    name: 'Erscheinungsbild',
    description: 'Theme, Sprache und Darstellungsoptionen',
    href: '/settings',
    icon: Palette,
    color: '#FF3B30',
    badge: 'Bald'
  },
  {
    name: 'Daten & Import',
    description: 'CSV-Import, Export und Datenbereinigung',
    href: '/leads',
    icon: Database,
    color: '#5AC8FA'
  }
]

export default function SettingsPage() {
  return (
    <>
      <Header
        title="Einstellungen"
        subtitle="CRM konfigurieren und anpassen"
      />

      <div className="page-content">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '16px'
        }}>
          {settingsItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                padding: '24px',
                background: 'var(--color-bg)',
                borderRadius: '20px',
                border: '1px solid var(--color-border)',
                textDecoration: 'none',
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
              className="hover:shadow-md hover:border-[var(--color-border-strong)]"
            >
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                background: `${item.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <item.icon size={24} style={{ color: item.color }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: '15px' }}>
                    {item.name}
                  </span>
                  {item.badge && (
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '100px',
                      background: 'var(--color-bg-tertiary)',
                      color: 'var(--color-text-tertiary)'
                    }}>
                      {item.badge}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}>
                  {item.description}
                </p>
              </div>
              <ChevronRight size={18} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
