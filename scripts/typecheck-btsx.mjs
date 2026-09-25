// Type-checks every .btsx component.
//
// `tsrx-tsc` only understands .tsrx, and `src/env.d.ts` declares `*.btsx` as an
// untyped module, so BTSX sources are otherwise never checked. This script
// mirrors `src` into `.beast/typecheck`, compiles each .btsx file to .tsrx next
// to it, points imports at the generated files, and runs `tsrx-tsc` over the copy.
import { cpSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outRoot = path.join(root, '.beast', 'typecheck')
const outSrc = path.join(outRoot, 'src')
const bin = (name) => path.join(root, 'node_modules', '.bin', name)

rmSync(outRoot, { recursive: true, force: true })
cpSync(path.join(root, 'src'), outSrc, { recursive: true })

const compiled = path.join(outRoot, 'compiled')
const built = spawnSync(bin('beast'), ['build', path.join(root, 'src'), '--out-dir', compiled, '--no-validate'], {
  stdio: 'inherit'
})
if (built.status !== 0) process.exit(built.status ?? 1)
cpSync(compiled, outSrc, { recursive: true })
rmSync(compiled, { recursive: true, force: true })

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })

for (const file of walk(outSrc)) {
  if (file.endsWith('.btsx') || file.endsWith('env.d.ts')) {
    rmSync(file)
    continue
  }
  if (!/\.(ts|tsrx)$/.test(file)) continue
  const source = readFileSync(file, 'utf8')
  const next = source.replace(/\.btsx(['"])/g, '.tsrx$1')
  if (next !== source) writeFileSync(file, next)
}

const base = JSON.parse(readFileSync(path.join(root, 'tsconfig.json'), 'utf8'))
const config = {
  compilerOptions: {
    ...base.compilerOptions,
    baseUrl: '.',
    paths: { '@/*': ['./src/*'] },
    typeRoots: [path.join(root, 'node_modules', '@types')]
  },
  include: ['src'],
  tsrx: base.tsrx
}
writeFileSync(path.join(outRoot, 'tsconfig.json'), JSON.stringify(config, null, 2))

const checked = spawnSync(bin('tsrx-tsc'), ['--noEmit', '-p', path.join(outRoot, 'tsconfig.json')], {
  encoding: 'utf8'
})
const lines = `${checked.stdout}${checked.stderr}`.split('\n').filter((line) => line.trim() && !line.startsWith('node_modules/') && !line.includes('/node_modules/'))
for (const line of lines) console.log(line.replaceAll(outSrc, 'src'))
process.exit(lines.some((line) => line.includes('error TS') || line.startsWith('[tsrx-tsc]')) ? 1 : 0)
