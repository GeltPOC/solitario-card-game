import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Solitario - Klondike',
  description: 'Classic Klondike Solitaire card game',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
