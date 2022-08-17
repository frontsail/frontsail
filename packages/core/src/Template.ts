import { clearArray, compareArrays, uniqueArray } from '@frontsail/utils'
import { Diagnostics } from './Diagnostics'
import { HTML } from './HTML'
import { Project } from './Project'
import { AtLeastOne } from './types/generic'
import { Dependencies, TemplateDiagnostics } from './types/template'
import { isAssetPath, isComponentName } from './validation'

/**
 * @todo
 *
 * ---
 *
 * Glossary:
 *
 * - **Asset** - A file located in the `assets` directory.
 *
 * - **AST** - Refers to an HTML abstract sytax tree.
 *
 * - **Dependency** - An asset or component included with the `<include>` tag.
 *
 * - **Include** - Refers to using the special `<include>` tag to render asset file
 *   contents or components.
 *
 * - **Safe slug** - A string that matches the pattern `/^[a-z]+(?:-[a-z0-9]+)*$/`.
 *   Note that this particular slug must start with a letter.
 */
export class Template extends Diagnostics<TemplateDiagnostics> {
  /**
   * A component name (e.g. 'ui/text-input') or a page path (e.g. '/contact').
   * The IDs must contain slugs that can be separated by forward slashes (`/`).
   * Component IDs always start with a safe slug and page IDs with a forward slash.
   */
  protected _id: string

  /**
   * An HTML class object instantiated from the template content.
   *
   * @see HTML for more details.
   */
  protected _html: HTML

  /**
   * The `Project` instance to which the template belongs.
   */
  protected _project?: Project

  /**
   * Collection of component names and asset paths directly included in this template.
   */
  protected _dependencies: Dependencies = {
    components: [],
    assets: [],
  }

  /**
   * Collection of diagnostics organized by types.
   */
  protected _diagnostics: TemplateDiagnostics = {
    attributeNames: [],
    dependencies: [],
    ifAttributes: [],
    includeElements: [],
    syntax: [],
  }

  /**
   * Instantiate with an abstract syntax tree and resolve its direct dependencies.
   */
  constructor(id: string, html: string, project?: Project) {
    super()

    this._id = id
    this._html = new HTML(html)
    this._project = project
    this._resolveDependencies()
  }

  /**
   * Get a list of all included assets in the template. This method does not
   * recursively get the dependencies of the included components. For depth checks,
   * use the method `getIncludedAssetPaths` in the `Project` class.
   */
  getIncludedAssetPaths(): string[] {
    return [...this._dependencies.assets]
  }

  /**
   * Get a list of all included components in the template. This method does not
   * recursively get the dependencies of the included components. For depth checks,
   * use the method `getIncludedComponentNames` in the `Project` class.
   */
  getIncludedComponentNames(): string[] {
    return [...this._dependencies.components]
  }

  /**
   * Get all extracted property names found in the HTML.
   */
  getPropertyNames(): string[] {
    return this._html.getPropertyNames()
  }

  /**
   * Check if the template includes a specific asset. This method does not
   * recursively check dependencies of the included components. For depth checks,
   * use the method `includesAsset` in the `Project` class.
   */
  includesAsset(path: string): boolean {
    return this._dependencies.assets.includes(path)
  }

  /**
   * Check if the template includes a specific component. This method does not
   * recursively check dependencies of the included components. For depth checks,
   * use the method `includesComponent` in the `Project` class.
   */
  includesComponent(name: string): boolean {
    return this._dependencies.components.includes(name)
  }

  /**
   * Analyze all nodes in the AST and run the specified `tests`. Use a wildcard
   * (`*`) to run all types of tests. Diagnostics can be retrieved with the method
   * `getDiagnostics()`.
   */
  lint(...tests: AtLeastOne<TemplateDiagnostics>): this {
    if (!this.hasProblems('syntax')) {
      this.clearDiagnostics(...tests)
      this.testAndMergeDiagnostics(this._html, ...tests)

      if (tests.includes('*') || !compareArrays(tests, this._html.filterTests(tests))) {
        for (const node of this._html.walk()) {
          if (HTML.adapter.isElementNode(node)) {
            //
            // Check dependencies
            //
            if (node.tagName === 'include' && this.shouldTest('dependencies', tests)) {
              const component: { name: string | null; properties: string[] } = {
                name: null,
                properties: [],
              }

              for (const attr of node.attrs) {
                if (attr.name === 'asset') {
                  if (!this._project?.hasAsset(attr.value)) {
                    this.addDiagnostics('attributeNames', {
                      message: 'Asset does not exist.',
                      severity: 'warning',
                      ...this._html.getAttributeValueRange(node, attr.name)!,
                    })
                  }
                } else if (attr.name === 'component') {
                  if (this._project?.hasComponent(attr.value)) {
                    component.name = attr.value
                    component.properties.push(...this._project.getPropertyNames(attr.value))
                  } else {
                    this.addDiagnostics('attributeNames', {
                      message: 'Component does not exist.',
                      severity: 'warning',
                      ...this._html.getAttributeValueRange(node, attr.name)!,
                    })
                  }
                }
              }

              if (component.name) {
                for (const attr of node.attrs) {
                  if (
                    !['if', 'asset', 'component'].includes(attr.name) &&
                    !component.properties.includes(attr.name)
                  ) {
                    this.addDiagnostics('attributeNames', {
                      message: `Property '${attr.name}' does not exist in component '${component.name}'.`,
                      severity: 'warning',
                      ...this._html.getAttributeNameRange(node, attr.name)!,
                    })
                  }
                }
              }
            }
          }
        }
      }
    }

    return this
  }

  /**
   * Extract component names and asset paths from the HTML AST.
   */
  protected _resolveDependencies(): void {
    const assets: string[] = []
    const components: string[] = []

    this._html.getElements('include').forEach((element) => {
      for (const attr of element.attrs) {
        if (attr.name === 'asset' && isAssetPath(attr.value)) {
          assets.push(attr.value)
        }

        if (attr.name === 'component' && isComponentName(attr.value)) {
          components.push(attr.value)
        }
      }
    })

    clearArray(this._dependencies.assets).push(...uniqueArray(assets).sort())
    clearArray(this._dependencies.components).push(...uniqueArray(components).sort())
  }
}
