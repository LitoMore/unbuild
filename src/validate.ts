import { existsSync } from 'fs'
import chalk from 'chalk'
import consola from 'consola'
import { resolve } from 'pathe'
import { PackageJson } from 'pkg-types'
import { extractExportFilenames, getpkg, warn } from './utils'
import { BuildContext } from './types'

export function validateDependencies (ctx: BuildContext) {
  const usedDependencies = new Set<string>()
  const unusedDependencies = new Set<string>(Object.keys(ctx.pkg.dependencies || {}))
  const implicitDependencies = new Set<string>()
  for (const id of ctx.usedImports) {
    unusedDependencies.delete(id)
    usedDependencies.add(id)
  }
  if (Array.isArray(ctx.options.dependencies)) {
    for (const id of ctx.options.dependencies) {
      unusedDependencies.delete(id)
    }
  }
  for (const id of usedDependencies) {
    if (
      !ctx.options.externals.includes(id) &&
      !id.startsWith('chunks/') &&
      !ctx.options.dependencies.includes(getpkg(id)) &&
      !ctx.options.peerDependencies.includes(getpkg(id))
    ) {
      implicitDependencies.add(id)
    }
  }
  if (unusedDependencies.size) {
    warn(ctx, 'Potential unused dependencies found:', Array.from(unusedDependencies).map(id => chalk.cyan(id)).join(', '))
  }
  if (implicitDependencies.size && !ctx.options.rollup.inlineDependencies) {
    warn(ctx, 'Potential implicit dependencies found:', Array.from(implicitDependencies).map(id => chalk.cyan(id)).join(', '))
  }
}

export function validatePackage (pkg: PackageJson, rootDir: string) {
  if (!pkg) { return }

  const filenames = new Set([
    ...typeof pkg.bin === 'string' ? [pkg.bin] : Object.values(pkg.bin || {}),
    pkg.main,
    pkg.module,
    pkg.types,
    pkg.typings,
    ...extractExportFilenames(pkg.exports).map(i => i.file)
  ].map(i => i && resolve(rootDir, i.replace(/\/[^/]*\*.*$/, ''))))

  const missingOutputs = []

  for (const filename of filenames) {
    if (filename && !filename.includes('*') && !existsSync(filename)) {
      missingOutputs.push(filename.replace(rootDir + '/', ''))
    }
  }
  if (missingOutputs.length) {
    consola.warn(`Potential missing package.json files: ${missingOutputs.map(o => chalk.cyan(o)).join(', ')}`)
  }
}
