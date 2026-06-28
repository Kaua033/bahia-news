"use client"

import Image from "next/image"
import { useEffect, useState } from "react"

interface Article {
  source: { id: string | null; name: string }
  author: string | null
  title: string
  description: string
  url: string
  urlToImage: string | null
  publishedAt: string
  content: string | null
}

const FALLBACK_IMG = "https://media.base44.com/images/public/6a3e9f3196fa26d5be60d39c/63c5948a8_generated_778f393e.png"

export default function ArticlePage({ params }: { params: { slug: string } }) {
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/news")
      .then((res) => res.json())
      .then((data) => {
        const found = (data.articles || []).find((a: Article) => {
          const slug = a.title?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
          return slug === params.slug
        })
        setArticle(found || null)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [params.slug])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">Carregando artigo...</p>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-4 text-4xl font-bold">Artigo não encontrado</h1>
        <p className="text-muted-foreground">O artigo que você procura não está disponível.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <article className="mx-auto max-w-3xl">
        {article.urlToImage && (
          <div className="relative mb-6 overflow-hidden rounded-lg">
            <Image
              src={article.urlToImage || FALLBACK_IMG}
              alt={article.title}
              width={1200}
              height={675}
              unoptimized
              className="w-full object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>
        )}
        <h1 className="mb-4 text-4xl font-bold leading-tight">{article.title}</h1>
        <div className="mb-6 font-mono text-xs uppercase tracking-wider text-muted-foreground">
          {article.author || article.source?.name || "Redação"}
        </div>
        <p className="mb-6 text-lg leading-relaxed text-muted-foreground">
          {article.description}
        </p>
        {article.content && (
          <p className="leading-relaxed">{article.content}</p>
        )}
        <div className="mt-8">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block border border-accent bg-accent px-6 py-3 font-mono text-xs uppercase tracking-wider text-background transition-all hover:bg-transparent hover:text-accent"
          >
            Ler original
          </a>
        </div>
      </article>
    </div>
  )
}
