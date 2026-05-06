#!/usr/bin/env node
import { program } from 'commander'
import { createInterface } from 'node:readline'
import { install } from './install.js'
import { doctor } from './doctor.js'
import { runCompact } from './compact.js'
import { runRecover } from './recover.js'
import { runSearch } from './search.js'
import { runHook } from './hook.js'

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

program
  .name('umem')
  .description('unified-memory: persistent context across Claude Code sessions')
  .version('1.0.0')

program
  .command('install')
  .description('Initialize memory for this project')
  .option('--force', 'Overwrite existing MEMORY.md')
  .option('--hooks', 'Install Claude Code hooks')
  .option('--name <name>', 'Project name (skip prompt)')
  .option('--stack <stack>', 'Stack description (skip prompt)')
  .option('--goal <goal>', 'Project goal (skip prompt)')
  .action(async (opts: { force?: boolean; hooks?: boolean; name?: string; stack?: string; goal?: string }) => {
    const projectRoot = process.cwd()

    const name = opts.name ?? await prompt('Project name: ')
    const stack = opts.stack ?? await prompt('Stack (e.g. TypeScript + Node.js): ')
    const goal = opts.goal ?? await prompt('Goal (one sentence): ')

    await install(projectRoot, name, stack, goal, { force: opts.force, hooks: opts.hooks })
  })

program
  .command('doctor')
  .description('Check memory health')
  .action(async () => {
    await doctor(process.cwd())
  })

program
  .command('compact')
  .description('Compact MEMORY.md to reduce token cost')
  .action(async () => {
    await runCompact(process.cwd())
  })

program
  .command('recover')
  .description('Recover MEMORY.md from git history and observations')
  .action(async () => {
    await runRecover(process.cwd())
  })

program
  .command('search <query>')
  .description('Search observation index')
  .option('--full', 'Show full content for results')
  .action((query: string, opts: { full?: boolean }) => {
    runSearch(process.cwd(), query, opts.full ?? false)
  })

program
  .command('hook <event>')
  .description('Run a Claude Code hook handler (session-start, user-prompt-submit, post-tool-use, stop, session-end)')
  .action(async (event: string) => {
    await runHook(event)
  })

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
