import { PrismaClient, Role } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@bahianews.com.br"
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123"

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  })

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12)

    await prisma.user.create({
      data: {
        name: "Administrador",
        email: adminEmail,
        passwordHash,
        role: Role.ADMIN,
      },
    })

    console.log(`Admin criado: ${adminEmail}`)
  }

  const categories = [
    { name: "Política", slug: "politica", description: "Notícias sobre política baiana e nacional" },
    { name: "Economia", slug: "economia", description: "Economia, negócios e finanças" },
    { name: "Esportes", slug: "esportes", description: "Esporte baiano e brasileiro" },
    { name: "Cultura", slug: "cultura", description: "Arte, cultura e entretenimento" },
    { name: "Bahia", slug: "bahia", description: "Notícias gerais do estado da Bahia" },
    { name: "Brasil", slug: "brasil", description: "Notícias nacionais" },
  ]

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    })
  }

  console.log("Categorias criadas com sucesso!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
