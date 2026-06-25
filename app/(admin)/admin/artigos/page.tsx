import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Artigos",
}

export default function AdminArticles() {
  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Artigos</h1>
        <Link
          href="/admin/artigos/novo"
          className="rounded bg-bahia-blue-600 px-4 py-2 text-white hover:bg-bahia-blue-700"
        >
          Novo Artigo
        </Link>
      </div>
    </div>
  )
}
