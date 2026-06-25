import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: {
    default: "Bahia News - O portal de notícias da Bahia",
    template: "%s | Bahia News",
  },
  description: "Fique por dentro das principais notícias da Bahia e do Brasil",
  openGraph: {
    title: "Bahia News",
    description: "O portal de notícias da Bahia",
    siteName: "Bahia News",
    type: "website",
    locale: "pt_BR",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
