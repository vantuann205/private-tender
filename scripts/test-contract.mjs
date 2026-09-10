import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = 'contracts/private-tender.compact';
const output = '.compact-generated/private-tender';
const command = process.platform === 'win32' ? 'wsl' : 'compactc';
const prefix = process.platform === 'win32' ? ['compactc'] : [];
const version = execFileSync(command, [...prefix, '--version'], { cwd: root, encoding: 'utf8' }).trim();
if (version !== '0.26.0') throw new Error(`Expected compactc 0.26.0, got ${version}`);
execFileSync(command, [...prefix, '--skip-zk', source, output], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, ['--test', 'contracts/private-tender.test.mjs'], { cwd: root, stdio: 'inherit' });
