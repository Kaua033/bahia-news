import { JSDOM } from "jsdom"
import DOMPurify from "dompurify"

const window = new JSDOM("").window
const purify = DOMPurify(window as any)

const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "u", "s", "h1", "h2", "h3", "h4",
  "ul", "ol", "li", "blockquote", "pre", "code", "a", "img",
  "hr", "sub", "sup",
]

const ALLOWED_ATTR = ["href", "src", "alt", "title", "target", "rel", "class"]

export function sanitizeHtml(dirty: string): string {
  return purify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ["target"],
  })
}

export function sanitizePlainText(text: string): string {
  return text.replace(/<[^>]*>/g, "").trim()
}
