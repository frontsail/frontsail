import esbuild from 'esbuild'

esbuild.build({
  entryPoints: ['src/index.ts'],
  outdir: 'dist',
  outExtension: { '.js': '.cjs' },
  bundle: true,
  platform: 'node',
  mainFields: ['module', 'main'],
  external: ['browser-sync', 'esbuild', 'fsevents', 'prettier'],
  minify: !process.argv.includes('--watch'),
  watch: process.argv.includes('--watch'),
})
