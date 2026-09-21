import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import { DataProvider } from '@/lib/DataContext'
import FolderPicker from '@/components/FolderPicker'

export const metadata: Metadata = {
  title: 'Token Dashboard',
  description: 'Claude token utilization dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="flex h-screen overflow-hidden" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}>
        <DataProvider>
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-6">
            <FolderPicker />
            {children}
          </main>
        </DataProvider>
      </body>
    </html>
  )
}
