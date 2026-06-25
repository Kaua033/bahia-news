export function Footer() {
  return (
    <footer className="border-t bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Bahia News. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  )
}
