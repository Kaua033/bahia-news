"use client"

import { useEffect, useState } from "react"

interface Article {
  source: { id: string | null; name: string }
  author: string | null
  title: string
  description: string
  url: string
  urlToImage: string | null
  publishedAt: string
}

const FALLBACK_IMG = "https://media.base44.com/images/public/6a3e9f3196fa26d5be60d39c/63c5948a8_generated_778f393e.png"

export default function CategoryPage({ params }: { params: { slug: string } }) {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/news?q=${encodeURIComponent(`${params.slug} Bahia`)}`)
      .then((res) => res.json())
      .then((data) => {
        setArticles(data.articles || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [params.slug])

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold capitalize">{params.slug}</h1>

      {loading && <p className="text-muted-foreground">Carregando notícias...</p>}

      {!loading && articles.length === 0 && (
        <p className="text-muted-foreground">Nenhuma notícia encontrada.</p>
      )}

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <a key={article.url} href={article.url} target="_blank" rel="noopener noreferrer">
            <article className="group cursor-pointer border-t-2 border-foreground pt-5">
              <div className="relative mb-4 overflow-hidden">
                <div className="aspect-[4/3]">
                  <img
                    src={article.urlToImage || FALLBACK_IMG}
                    alt={article.title}
                    className="size-full object-cover transition-transform duration-600 group-hover:scale-105"
                  />
                </div>
              </div>
              <h3 className="mt-2 text-lg font-bold leading-snug text-foreground transition-colors duration-300 group-hover:text-bahia-blue">
                {article.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {article.description}
              </p>
              <div className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {article.author || article.source?.name || "Redação"}
              </div>
            </article>
          </a>
        ))}
      </div>
    </div>
  )
}
