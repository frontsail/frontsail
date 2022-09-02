import * as packageJSON from '../package.json'

/**
 * Starter project contents.
 */
export const starter = {
  vscodeSettingsJSON: {
    'editor.formatOnSave': false,
    'emmet.triggerExpansionOnTab': true,
    'html.customData': ['.vscode/frontsail.html-data.json'],
  },
  vscodeFrontsailHtmlDataJSON: {
    version: 1.1,
    tags: [
      {
        name: 'include',
        description:
          'Imports a FrontSail component by a name specified in the `component` attribute value of this element.',
        attributes: [
          {
            name: 'component',
            description: 'Full name of the component to include.',
          },
        ],
        references: [
          {
            name: 'FrontSail Documentation',
            url: 'https://www.frontsail.com/docs/include',
          },
        ],
      },
      {
        name: 'inject',
        description:
          'Fills its contents into a specific `<outlet>` named as the `into` attribute value of this element.',
        attributes: [
          {
            name: 'into',
            description: 'An outlet name where the content should be injected.',
          },
        ],
        references: [
          {
            name: 'FrontSail Documentation',
            url: 'https://www.frontsail.com/docs/inject',
          },
        ],
      },
      {
        name: 'markdown',
        description:
          'Allows use of Markdown syntax, which is parsed into HTML during the build process.',
        references: [
          {
            name: 'FrontSail Documentation',
            url: 'https://www.frontsail.com/docs/markdown',
          },
        ],
      },
      {
        name: 'outlet',
        description:
          'A placeholder that FrontSail dynamically fills with content from an `<include>` element.',
        attributes: [
          {
            name: 'name',
            description: 'A unique name for the outlet (defaults to `main`).',
          },
        ],
        references: [
          {
            name: 'FrontSail Documentation',
            url: 'https://www.frontsail.com/docs/outlet',
          },
        ],
      },
    ],
  },
  srcGlobalsJSON: {
    $baseTitle: 'FrontSail',
    $dark: '#232425',
    $light: '#fafbfc',
    $primary: '#016789',
    $sm: '(min-width: 640px)',
    $md: '(min-width: 768px)',
    $lg: '(min-width: 1024px)',
    $xl: '(min-width: 1280px)',
    $2xl: '(min-width: 1536px)',
  },
  srcMainJS: ["import Alpine from 'alpinejs'", '', 'setTimeout(Alpine.start)', ''],
  srcComponentsBaseHTML: [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '  <head>',
    '    <meta charset="UTF-8" />',
    '    <meta http-equiv="X-UA-Compatible" content="IE=edge" />',
    '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    '    <title>{{ title }} - {{ $baseTitle }}</title>',
    '    <link href="/style.css" rel="stylesheet" />',
    '    <script src="/script.js" defer></script>',
    '  </head>',
    '  <body>',
    '    <outlet></outlet>',
    '  </body>',
    '</html>',
    '',
  ],
  srcPagesIndexHTML: [
    '<include component="base" title="Shipping websites at full speed">',
    '  <h1>Hello, world!</h1>',
    '</include>',
    '',
  ],
  frontsailConfigJSON: {
    cssReset: true,
    subdirectory: '',
  },
  gitignore: [
    '/dist/',
    'node_modules/',
    '.DS_Store',
    '.DS_Store?',
    '._*',
    '.env',
    '.Spotlight-V100',
    '.Trashes',
    'ehthumbs.db',
    'Thumbs.db',
    '',
  ],
  packageJSON: {
    name: 'my-frontsail-project',
    version: '0.1.0',
    type: 'module',
    scripts: {
      cli: 'frontsail',
      build: 'frontsail --build',
    },
    devDependencies: {
      '@frontsail/cli': `^${packageJSON.version}`,
      'alpinejs': '^3.10.3',
    },
  },
}

/**
 * CSS reset.
 *
 * @see https://github.com/elad2412/the-new-css-reset
 */
export const cssReset = [
  `/***`,
  `    The new CSS reset - version 1.7.3 (last updated 7.8.2022)`,
  `    GitHub page: https://github.com/elad2412/the-new-css-reset`,
  `***/`,
  ``,
  `/*`,
  `    Remove all the styles of the "User-Agent-Stylesheet", except for the 'display' property`,
  `    - The "symbol *" part is to solve Firefox SVG sprite bug`,
  ` */`,
  `*:where(:not(html, iframe, canvas, img, svg, video, audio):not(svg *, symbol *)) {`,
  `  all: unset;`,
  `  display: revert;`,
  `}`,
  ``,
  `/* Preferred box-sizing value */`,
  `*,`,
  `*::before,`,
  `*::after {`,
  `  box-sizing: border-box;`,
  `}`,
  ``,
  `/* Reapply the pointer cursor for anchor tags */`,
  `a,`,
  `button {`,
  `  cursor: revert;`,
  `}`,
  ``,
  `/* Remove list styles (bullets/numbers) */`,
  `ol,`,
  `ul,`,
  `menu {`,
  `  list-style: none;`,
  `}`,
  ``,
  `/* For images to not be able to exceed their container */`,
  `img {`,
  `  max-width: 100%;`,
  `}`,
  ``,
  `/* removes spacing between cells in tables */`,
  `table {`,
  `  border-collapse: collapse;`,
  `}`,
  ``,
  `/* Safari - solving issue when using user-select:none on the <body> text input doesn't working */`,
  `input,`,
  `textarea {`,
  `  -webkit-user-select: auto;`,
  `}`,
  ``,
  `/* revert the 'white-space' property for textarea elements on Safari */`,
  `textarea {`,
  `  white-space: revert;`,
  `}`,
  ``,
  `/* minimum style to allow to style meter element */`,
  `meter {`,
  `  -webkit-appearance: revert;`,
  `  appearance: revert;`,
  `}`,
  ``,
  `/* reset default text opacity of input placeholder */`,
  `::placeholder {`,
  `  color: unset;`,
  `}`,
  ``,
  `/* fix the feature of 'hidden' attribute.`,
  `   display:revert; revert to element instead of attribute */`,
  `:where([hidden]) {`,
  `  display: none;`,
  `}`,
  ``,
  `/* revert for bug in Chromium browsers`,
  `   - fix for the content editable attribute will work properly.`,
  `   - webkit-user-select: auto; added for Safari in case of using user-select:none on wrapper element*/`,
  `:where([contenteditable]:not([contenteditable='false'])) {`,
  `  -moz-user-modify: read-write;`,
  `  -webkit-user-modify: read-write;`,
  `  -webkit-line-break: after-white-space;`,
  `  -webkit-user-select: auto;`,
  `  overflow-wrap: break-word;`,
  `}`,
  ``,
  `/* apply back the draggable feature - exist only in Chromium and Safari */`,
  `:where([draggable='true']) {`,
  `  -webkit-user-drag: element;`,
  `}`,
  ``,
]
