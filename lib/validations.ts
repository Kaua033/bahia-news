import { z } from "zod"

export const loginSchema = z.object({
  email: z
    .string()
    .email("Email inválido")
    .max(255, "Email muito longo")
    .transform((v) => v.toLowerCase().trim()),
  password: z
    .string()
    .min(8, "Mínimo de 8 caracteres")
    .max(128, "Senha muito longa"),
})

const slugSchema = z
  .string()
  .max(200)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug inválido")
  .optional()

export const articleSchema = z.object({
  title: z
    .string()
    .min(3, "Título deve ter no mínimo 3 caracteres")
    .max(200, "Título muito longo"),
  slug: slugSchema,
  excerpt: z
    .string()
    .max(500, "Resumo muito longo")
    .optional(),
  content: z
    .string()
    .min(1, "Conteúdo é obrigatório")
    .max(100000, "Conteúdo muito extenso"),
  coverImage: z
    .string()
    .url("URL de imagem inválida")
    .optional()
    .or(z.literal("")),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  featured: z.boolean().default(false),
  categoryId: z.string().min(1, "Categoria é obrigatória"),
  tagIds: z.array(z.string()).max(10, "Máximo de 10 tags").optional(),
})

export const categorySchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter no mínimo 2 caracteres")
    .max(100, "Nome muito longo"),
  description: z
    .string()
    .max(500, "Descrição muito longa")
    .optional(),
})

export const newsQuerySchema = z.object({
  q: z
    .string()
    .max(100, "Query muito longa")
    .default("Bahia"),
})

export type LoginInput = z.infer<typeof loginSchema>
export type ArticleInput = z.infer<typeof articleSchema>
export type CategoryInput = z.infer<typeof categorySchema>
