import esbuild from 'esbuild'

esbuild.build({
  entryPoints: ['src/index.ts'],
  outdir: 'dist',
  bundle: true,
  platform: 'neutral',
  mainFields: ['module', 'main'],
  minify: !process.argv.includes('--watch'),
  watch: process.argv.includes('--watch'),
})
