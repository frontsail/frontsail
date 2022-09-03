export { Component } from './Component'
export { CSS } from './CSS'
export { Diagnostics } from './Diagnostics'
export { HTML } from './HTML'
export { JS } from './JS'
export { JSON } from './JSON'
export { Page } from './Page'
export { Project } from './Project'
export { ProjectDiagnostics } from './ProjectDiagnostics'
export { Template } from './Template'
export { CodePart, Diagnostic, Range, RenderDiagnostic } from './types/code'
export { CSSDiagnostics, Modifier } from './types/css'
export { AtLeastOne, WithWildcard } from './types/generic'
export { AttributeValue, HTMLDiagnostics, MustacheTag } from './types/html'
export { JSDiagnostics } from './types/js'
export { JSONDiagnostics } from './types/json'
export {
  CustomCSSDiagnostics,
  CustomJSDiagnostics,
  GlobalVariable,
  ProjectOptions,
  RenderResults,
} from './types/project'
export { Injections, TemplateDiagnostics, TemplateRenderResults } from './types/template'
export {
  isAlpineDirective,
  isAssetPath,
  isAttributeName,
  isComponentName,
  isEnclosed,
  isGlobalName,
  isPagePath,
  isPropertyName,
  isSafeSlug,
  isXForDirective,
} from './validation'
import { marked } from 'marked'

// Set default `marked` options
const renderer = new marked.Renderer()
renderer.heading = (text, level) => `<h${level}>${text}</h${level}>`
marked.setOptions({ renderer, silent: true })
