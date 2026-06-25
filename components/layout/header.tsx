import Link from "next/link"

export function Header() {
  return (
    <header className="border-b bg-white">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <Link href="/noticias" className="text-2xl font-bold text-bahia-blue-700">
          Bahia News
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/noticias" className="text-sm font-medium text-gray-600 hover:text-bahia-blue-600">
            Home
          </Link>
        </nav>
      </div>
    </header>
  )
}
