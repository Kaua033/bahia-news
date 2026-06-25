import Link from "next/link"

const sidebarItems = [
  { label: "Dashboard", href: "/admin", icon: "LayoutDashboard" },
  { label: "Artigos", href: "/admin/artigos", icon: "FileText" },
  { label: "Categorias", href: "/admin/categorias", icon: "FolderTree" },
  { label: "Configurações", href: "/admin/configuracoes", icon: "Settings" },
]

export function AdminSidebar() {
  return (
    <aside className="flex w-64 flex-col border-r bg-white">
      <div className="border-b px-6 py-4">
        <Link href="/admin" className="text-xl font-bold text-bahia-blue-700">
          Bahia News
        </Link>
        <p className="text-xs text-gray-500">Painel Administrativo</p>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {sidebarItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-bahia-blue-600"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
