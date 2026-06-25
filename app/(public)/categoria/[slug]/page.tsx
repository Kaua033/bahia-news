interface CategoryPageProps {
  params: { slug: string }
}

export default function CategoryPage({ params }: CategoryPageProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold capitalize">{params.slug}</h1>
    </div>
  )
}
