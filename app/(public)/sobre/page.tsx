import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sobre",
}

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Sobre o Bahia News</h1>
      <div className="prose-bahia max-w-3xl">
        <p>
          O Bahia News é um portal de notícias dedicado a cobrir os principais
          acontecimentos do estado da Bahia.
        </p>
      </div>
    </div>
  )
}
