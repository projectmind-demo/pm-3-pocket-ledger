import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

const output = path.resolve('dist');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await Promise.all(['index.html', 'app.js', 'styles.css'].map((file) => cp(file, path.join(output, file))));
console.log('Built static site in dist/');
