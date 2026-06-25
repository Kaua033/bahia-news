import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo de 6 caracteres"),
})

export const articleSchema = z.object({
  title: z.string().min(3, "Título deve ter no mínimo 3 caracteres"),
  slug: z.string().optional(),
  excerpt: z.string().optional(),
  content: z.string().min(1, "Conteúdo é obrigatório"),
  coverImage: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  featured: z.boolean().default(false),
  categoryId: z.string().min(1, "Categoria é obrigatória"),
  tagIds: z.array(z.string()).optional(),
})

export const categorySchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  description: z.string().optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type ArticleInput = z.infer<typeof articleSchema>
export type CategoryInput = z.infer<typeof categorySchema>
