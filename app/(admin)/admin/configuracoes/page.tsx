import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Configurações",
}

export default function AdminSettings() {
  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold">Configurações</h1>
    </div>
  )
}
