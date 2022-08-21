import { Project } from '..'

test('resolving alpine data (1)', () => {
  const js = new Project({
    components: [{ name: 'foo', html: '<button @click="foo"></button>' }],
  }).buildJS()

  expect(js).toBe(
    [
      "document.addEventListener('alpine:init', () => {",
      "  Alpine.data('_c1_D', () => ({",
      '    _c1b1_D: {',
      "      '@click'() {",
      '        return foo',
      '      }',
      '    }',
      '  }))',
      '})',
    ].join('\n'),
  )
})

test('resolving alpine data (2)', () => {
  const js = new Project({
    components: [
      {
        name: 'foo',
        html: `
<div
  x-data="{
    colors: ['red', 'green', 'blue'],
  }"
>
  <ul x-for="(color, index) in colors">
    <span x-text="index + '.'"></span>
    <span x-text="color"></span>
  </ul>
  <template x-if="colors.length">
    <button @click="global.action()" :parent-data="this.fromParent.color || this.color"></button>
  </template>
</div>`,
      },
    ],
  }).buildJS()

  expect(js).toBe(
    [
      "document.addEventListener('alpine:init', () => {",
      "  Alpine.data('_c1_D', () => ({",
      "    colors: ['red', 'green', 'blue'],",
      '    _c1b1_D: {',
      "      'x-text'() {",
      "        return this.index + '.'",
      '      }',
      '    },',
      '    _c1b2_D: {',
      "      'x-text'() {",
      '        return this.color',
      '      }',
      '    },',
      '    _c1b3_D: {',
      "      'x-if'() {",
      '        return this.colors.length',
      '      }',
      '    },',
      '    _c1b4_D: {',
      "      '@click'() {",
      '        return global.action()',
      '      },',
      "      ':parent-data'() {",
      '        return this.fromParent.color || this.color',
      '      }',
      '    }',
      '  }))',
      '})',
    ].join('\n'),
  )
})
