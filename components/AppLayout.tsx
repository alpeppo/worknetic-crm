'use client'

import { useSidebar } from './SidebarProvider'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar()

  return (
    <div className="app-layout" data-sidebar-collapsed={isCollapsed ? 'true' : undefined}>
      {children}
    </div>
  )
}
