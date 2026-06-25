import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Painel Administrativo",
}

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold">Painel Administrativo</h1>
    </div>
  )
}
