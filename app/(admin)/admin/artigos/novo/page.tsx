import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Novo Artigo",
}

export default function NewArticle() {
  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold">Novo Artigo</h1>
    </div>
  )
}
