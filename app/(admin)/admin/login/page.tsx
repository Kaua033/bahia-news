import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Login",
}

export default function AdminLogin() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-bold text-bahia-blue-700">
          Bahia News - Admin
        </h1>
      </div>
    </div>
  )
}
