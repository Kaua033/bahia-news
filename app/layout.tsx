import type { Metadata } from "next"
import { Inter, JetBrains_Mono, Playfair_Display } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "600"],
})

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-playfair-display",
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
})

export const metadata: Metadata = {
  title: {
    default: "Diário do Farol — O jornal da Bahia",
    template: "%s | Diário do Farol",
  },
  description:
    "O portal de notícias da Bahia. Política, Cultura, Carnaval, Esportes, Gastronomia e Turismo.",
  openGraph: {
    title: "Diário do Farol",
    description: "O jornal da Bahia de Todos os Santos",
    siteName: "Diário do Farol",
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
    <html
      lang="pt-BR"
      className={`${inter.variable} ${jetbrainsMono.variable} ${playfairDisplay.variable}`}
    >
      <body className="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-accent/20 selection:text-accent">
        {children}
      </body>
    </html>
  )
}
