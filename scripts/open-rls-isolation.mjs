/**
 * Copies supabase/tests/rls_isolation.sql and opens the SQL Editor.
 * Windows: uses clip.exe + start. Other OS: prints path + URL.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const sqlPath = join(root, 'supabase', 'tests', 'rls_isolation.sql')
const sql = readFileSync(sqlPath, 'utf8')
const editor =
  'https://supabase.com/dashboard/project/baqobrvwblxfmzsiboec/sql/new'

if (process.platform === 'win32') {
  spawnSync('clip', [], { input: sql, shell: true })
  spawnSync('cmd', ['/c', 'start', '', editor], { shell: true })
  console.log('Copied rls_isolation.sql to clipboard.')
  console.log('SQL Editor opened — Ctrl+V then Run.')
  console.log('Look for NOTICE: RLS_ISOLATION_PASS')
} else {
  console.log(sqlPath)
  console.log(editor)
  console.log('Open the URL, paste the SQL file, Run → RLS_ISOLATION_PASS')
}
