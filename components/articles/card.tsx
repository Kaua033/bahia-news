import Link from "next/link"

interface ArticleCardProps {
  title: string
  slug: string
  excerpt: string | null
  coverImage: string | null
  author: { name: string | null }
  publishedAt: Date | null
}

export function ArticleCard({
  title,
  slug,
  excerpt,
  coverImage,
  author,
  publishedAt,
}: ArticleCardProps) {
  return (
    <Link href={`/artigo/${slug}`} className="group block">
      <article className="overflow-hidden rounded-lg border bg-white shadow-sm transition-shadow hover:shadow-md">
        {coverImage && (
          <div className="aspect-video overflow-hidden bg-gray-100">
            <img
              src={coverImage}
              alt={title}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          </div>
        )}
        <div className="p-4">
          <h2 className="mb-2 text-lg font-semibold text-gray-900 group-hover:text-bahia-blue-600">
            {title}
          </h2>
          {excerpt && (
            <p className="mb-3 text-sm text-gray-600 line-clamp-2">{excerpt}</p>
          )}
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{author.name}</span>
          </div>
        </div>
      </article>
    </Link>
  )
}
