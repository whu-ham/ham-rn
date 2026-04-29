/**
 * @author orangeboyChen
 * @version 1.0
 * @date 2026/4/29 12:23
 */
import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';

const EMBED_DIR = path.resolve(
  __dirname,
  '../src/business/education/scorecalc/embed',
);
const OUTPUT_DIR = path.resolve(EMBED_DIR, 'generated');

async function build() {
  // Clean and recreate output directory
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, {recursive: true});
  }
  fs.mkdirSync(OUTPUT_DIR, {recursive: true});

  // Collect all .ts files in embed dir (excluding generated/)
  const files = fs.readdirSync(EMBED_DIR).filter(f => {
    if (f === 'generated') {
      return false;
    }
    return f.endsWith('.ts') || f.endsWith('.tsx');
  });

  for (const file of files) {
    const inputPath = path.resolve(EMBED_DIR, file);
    const baseName = path.basename(file, path.extname(file));
    const outputPath = path.resolve(OUTPUT_DIR, `${baseName}.generated.ts`);

    const result = await esbuild.build({
      entryPoints: [inputPath],
      bundle: true,
      write: false,
      format: 'iife',
      platform: 'browser',
      minify: true,
      target: ['es2017'],
    });

    const code = result.outputFiles[0].text;

    const content = `// ⚠️ auto-generated from ${file}, do not edit
export default ${JSON.stringify(code)};
`;

    fs.writeFileSync(outputPath, content);
  }
}

build().catch(() => {
  process.exit(1);
});
