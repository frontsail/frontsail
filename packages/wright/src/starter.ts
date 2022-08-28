/**
 * Starter project contents.
 */
export const starter = {
  frontsailConfigJSON: {
    subdirectory: '',
  },
  gitignore:
    [
      '/dist/',
      '.DS_Store',
      '.DS_Store?',
      '._*',
      '.env',
      '.Spotlight-V100',
      '.Trashes',
      'ehthumbs.db',
      'Thumbs.db',
    ].join('\n') + '\n',
  globalsJSON: {
    $baseTitle: 'My FrontSail Project',
    $dark: '#232425',
    $light: '#fafbfc',
    $primary: '#016789',
    $sm: '(min-width: 640px)',
    $md: '(min-width: 768px)',
    $lg: '(min-width: 1024px)',
    $xl: '(min-width: 1280px)',
    $2xl: '(min-width: 1536px)',
  },
  packageJSON: {
    name: 'my-frontsail-project',
    version: '0.1.0',
    type: 'module',
    scripts: {
      build: '@frontsail/cli --build',
      dev: '@frontsail/cli --dev',
      frontsail: '@frontsail/cli',
    },
    devDependencies: {
      '@frontsail/cli': '^0.1.0',
    },
  },
}
