import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SidebarProvider } from "@/components/SidebarProvider";
import { CommandPalette } from "@/components/CommandPalette";
import { ToastProvider } from "@/components/ToastProvider";
import { AppLayout } from "@/components/AppLayout";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Worknetic CRM",
  description: "Sales-focused CRM for Coaches & Consultants",
  manifest: "/manifest.json",
  themeColor: "#3730A3",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Worknetic CRM",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('worknetic-theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark')}catch(e){}})()`,
          }}
        />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <ToastProvider>
            <SidebarProvider>
              <AppLayout>
                <Sidebar />
                <main className="main-content">
                  {children}
                </main>
              </AppLayout>
              <CommandPalette />
            </SidebarProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
