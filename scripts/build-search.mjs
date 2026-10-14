import { cp, mkdir, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const staging = '.next/pagefind-source'
const output = 'public/_pagefind'

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(error => {
    if (error.code === 'ENOENT') return []
    throw error
  })
  const files = await Promise.all(entries.map(async entry => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? htmlFiles(path) : entry.name.endsWith('.html') ? [path] : []
  }))
  return files.flat()
}

// With a deployment adapter, Next.js 16.4 stores prerenders under
// route-cache/APP_PAGE/<source hash>/$<pathname>.html instead of server/app.
// Stage public URL paths so Pagefind never exposes the cache hash or "$".
const cached = await htmlFiles('.next/server/route-cache/APP_PAGE')
const legacy = await htmlFiles('.next/server/app')
const pages = new Map()
for (const file of legacy) pages.set(file.slice('.next/server/app/'.length), file)
for (const file of cached) {
  const marker = file.indexOf('/$/')
  if (marker < 0) throw new Error(`Unrecognized Next.js HTML cache path: ${file}`)
  pages.set(file.slice(marker + 3), file)
}
if (!pages.size) throw new Error('No prerendered HTML found; refusing to build an empty search index.')

await rm(staging, { recursive: true, force: true })
for (const [pathname, file] of pages) {
  const destination = join(staging, pathname)
  await mkdir(join(destination, '..'), { recursive: true })
  await cp(file, destination)
}
await rm(output, { recursive: true, force: true })
console.log(`Indexing ${pages.size} prerendered HTML files with their public URL paths.`)
const result = spawnSync('pagefind', ['--site', staging, '--output-path', output], { stdio: 'inherit' })
if (result.error) throw result.error
if (result.status !== 0) process.exit(result.status ?? 1)

// The Vercel adapter copies public/ during next build, before this script runs.
// Add the fresh index to its Build Output API assets as well.
const adapterOutput = '.next/output/static'
try {
  await readdir(adapterOutput)
} catch (error) {
  if (error.code !== 'ENOENT') throw error
  process.exit(0)
}
await rm(join(adapterOutput, '_pagefind'), { recursive: true, force: true })
await cp(output, join(adapterOutput, '_pagefind'), { recursive: true })
console.log('Copied search index into Vercel adapter static output.')
