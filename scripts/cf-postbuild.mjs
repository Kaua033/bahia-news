import { execSync } from "node:child_process"

// The Docker image only needs the Next.js standalone output.
if (process.env.DOCKER_BUILD === "true") {
  console.log("Skipping Cloudflare postbuild (DOCKER_BUILD=true).")
  process.exit(0)
}

execSync("opennextjs-cloudflare build --skipNextBuild", { stdio: "inherit" })
execSync("node scripts/prune-opennext.mjs", { stdio: "inherit" })
