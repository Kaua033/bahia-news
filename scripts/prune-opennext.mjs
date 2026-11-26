import { readdir, rm, stat } from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"

const root = ".open-next/server-functions/default/node_modules"

const filesToRemove = [
  // Native query engine: cannot run in workerd, the edge/WASM engine is used instead.
  [".prisma/client", /^libquery_engine-.*\.so\.node$/],
  // Only PostgreSQL is used by this app: drop the MySQL and SQLite WASM engines.
  ["@prisma/client/runtime", /^query_engine_bg\.(mysql|sqlite)\.wasm$/],
]

const dirsToRemove = [
  // Build-time code generator, not needed at runtime.
  "@prisma/client/generator-build",
  "@prisma/client/scripts",
]

async function removeMatchingFiles(dir, pattern) {
  if (!existsSync(dir)) return 0
  let removed = 0
  for (const entry of await readdir(dir)) {
    if (!pattern.test(entry)) continue
    const file = path.join(dir, entry)
    const info = await stat(file)
    if (!info.isFile()) continue
    await rm(file, { force: true })
    console.log(`pruned ${file}`)
    removed++
  }
  return removed
}

let removed = 0
for (const [relDir, pattern] of filesToRemove) {
  removed += await removeMatchingFiles(path.join(root, relDir), pattern)
}
for (const relDir of dirsToRemove) {
  const dir = path.join(root, relDir)
  if (!existsSync(dir)) continue
  await rm(dir, { recursive: true, force: true })
  console.log(`pruned ${dir}`)
  removed++
}

console.log(`OpenNext prune complete (${removed} item(s) removed).`)
