import esbuild from 'esbuild'

esbuild.build({
  entryPoints: ['src/index.ts'],
  outdir: 'dist',
  bundle: true,
  platform: 'neutral',
  mainFields: ['module', 'main'],
  watch: process.argv.includes('--watch'),
})
