import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { build } from 'esbuild';

// The extension ships as a single bundled file so activation reads one script instead of
// walking dozens of CommonJS modules. Locale JSON stays on disk and is loaded lazily by
// I18nManager (only two of the 18 files are ever read), so it is copied rather than inlined.
const outDir = 'dist';

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

await build({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    outfile: `${outDir}/extension.js`,
    // 'vscode' is provided by the host at runtime and must never be bundled.
    external: ['vscode'],
    platform: 'node',
    format: 'cjs',
    // VS Code 1.90 ships Node 20.
    target: 'node20',
    minify: true,
    sourcemap: false,
    logLevel: 'info'
});

// I18nManager resolves locales relative to __dirname, which is `dist` for the bundle.
cpSync('src/i18n/locales', `${outDir}/locales`, { recursive: true });
