import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
const patterns = [/\bgsk_[A-Za-z0-9]{25,}/, /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, /mongodb(?:\+srv)?:\/\/[^\s<>:@]+:([^\s<>@]+)@/];
const findings = [];
for (const path of new Set(files)) {
  if (/\.(png|jpg|jpeg|webp|gif|ico|woff2?|ttf|mp[34]|glb|sqlite|zip|pdf)$/i.test(path)) continue;
  try {
    if (!statSync(resolve(root, path)).isFile()) continue;
    const lines = readFileSync(resolve(root, path), 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      if (patterns.some(pattern => { const match = line.match(pattern); return match && (!match[1] || !/your[_-]|placeholder|encode|password|\$\{/i.test(match[1])); })) findings.push(`${path}:${index + 1}`);
    });
  } catch { /* Deleted paths cannot add new secrets. */ }
}
if (findings.length) { console.error('Potential private credential material (values suppressed):\n' + findings.join('\n')); process.exitCode = 1; }
else console.info('No private key blocks, Groq keys or credential-bearing MongoDB URLs found in tracked/unignored source. Actual .env files remain ignored.');
