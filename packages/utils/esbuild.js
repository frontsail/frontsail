import esbuild from 'esbuild'

esbuild.build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'neutral',
  mainFields: ['module', 'main'],
  minify: !process.argv.includes('--watch'),
  watch: process.argv.includes('--watch'),
})

esbuild.build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.cjs',
  bundle: true,
  platform: 'node',
  target: ['node16.3.0'],
  minify: !process.argv.includes('--watch'),
  watch: process.argv.includes('--watch'),
})
