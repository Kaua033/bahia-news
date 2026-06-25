interface ArticlePageProps {
  params: { slug: string }
}

export default function ArticlePage({ params }: ArticlePageProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <article className="mx-auto max-w-3xl">
        <h1 className="mb-4 text-4xl font-bold">{params.slug}</h1>
      </article>
    </div>
  )
}
