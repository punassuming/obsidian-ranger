import esbuild from 'esbuild';

const banner = `/*
THIS IS A GENERATED FILE. DO NOT EDIT DIRECTLY.
The source lives in src/main.ts
*/`;

const context = await esbuild.context({
  entryPoints: ['src/main.ts'],
  bundle: true,
  outfile: 'main.js',
  target: 'es2018',
  format: 'cjs',
  platform: 'browser',
  sourcemap: true,
  banner: { js: banner },
  external: ['obsidian'],
});

if (process.argv.includes('--watch')) {
  await context.watch();
  console.log('Watching for changes...');
} else {
  await context.rebuild();
  await context.dispose();
  console.log('Build complete.');
}
