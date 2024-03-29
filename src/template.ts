import { addTemplate } from '@nuxt/kit'
import type { NuxtTemplate } from '@nuxt/schema'
import { resolvePath } from 'mlly'
import type { ThemeConfig, ModuleOptions } from './types'

export function writeThemeTypes(config: ThemeConfig[], colors: string[], options: ModuleOptions){
    const { variations = [], layers = {} } = options
    const { overwriteTypes = false } = layers

    // write text types
    const template: NuxtTemplate = {
      filename: `types/theme.d.ts`,
      getContents: async () => {
        return `import type { Defu } from 'defu'
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object
    ? DeepPartial<T[P]> & Partial<T[P]>
    : T[P];
};
export type TailwindColors = ${colors.length > 0 ? colors.map((color) => `'${color}'`).join(' | ') : 'empty'}
export type ThemeVariations = 'default'${ variations.length > 0 ? ' |' : ''  } ${variations.length > 0 ? variations.map((name) => `'${name}'` ).join(' | ') : ''}
export type ThemeTypes = ${config.length > 0 ? config.map((c) => `'${c.name}'` ).join(' | ') : 'empty'}
${config.map((c) => c.imports.defaults.filter((file, index) => (overwriteTypes || (!overwriteTypes && index === 0))).map((file, index) => `import ${`l${index}_${c.name}`} from '${file.path}'`).join('\n')).join('\n')}
${config.map((c) => `export type ${c.name.charAt(0).toUpperCase() + c.name.slice(1)}Config = Defu<typeof l0_${c.name}, [${c.imports.defaults.slice(1).filter((file, index) => (overwriteTypes || (!overwriteTypes && index > 0))).map((file, index) => `typeof l${index+1}_${c.name}`).join(', ')}]>`).join('\n')}
${config.map((c) => `export type ${c.name.charAt(0).toUpperCase() + c.name.slice(1)} = { 
  keys: Extract<keyof ${c.name.charAt(0).toUpperCase() + c.name.slice(1)}Config["base"], string>
  variants: Extract<keyof NonNullable<${c.name.charAt(0).toUpperCase() + c.name.slice(1)}Config["variants"]>, string> | 'default'
  options: {
    [P in keyof NonNullable<${c.name.charAt(0).toUpperCase() + c.name.slice(1)}Config["options"]>]?: Record<keyof NonNullable<${c.name.charAt(0).toUpperCase() + c.name.slice(1)}Config["options"][P]>, string>
  }
  presets: Extract<keyof ${c.name.charAt(0).toUpperCase() + c.name.slice(1)}Config["presets"], string>
}`).join('\n')}
export type Themes = {
  ${config.length > 0 ? config.map((c) => `${c.name}: ${c.name.charAt(0).toUpperCase() + c.name.slice(1)}`).join('\n') : 'empty: \'\''}
}
export type ThemeConfigs = {
  ${config.length > 0 ? config.map((c) => `${c.name}: ${c.name.charAt(0).toUpperCase() + c.name.slice(1)}Config`).join('\n') : 'empty: \'\''}
}
`
    }
  }
  addTemplate(template)
}

export function writeThemeTemplates(config: ThemeConfig[], colors: string[], options: ModuleOptions){
    const { variations = [] } = options
    // write config
    for(const c of config){
      const template: NuxtTemplate = {
        filename: `theme/${c.name}.ts`,
        write: true,
        getContents: async () => {
          return `import { defu } from '${await _resolveId('defu')}'
${c.imports.defaults.map((file, index) => `import ${`l${index}_${c.name}_default`} from '${file.path}'`).join('\n')}
${c.imports.variations.filter((theme) => (variations.indexOf(theme.name) !== -1)).map((theme) => theme.files.map((file, index) => `import ${`l${index}_${c.name}_${theme.name}`} from '${file.path}'`).join('\n')).join('\n')}
const defaultTheme = defu(${c.imports.defaults.map((file, index) => `l${index}_${c.name}_default`).join(', ')})
${c.imports.variations.filter((theme) => (variations.indexOf(theme.name) !== -1)).map((theme) => `const ${theme.name} = defu(${theme.files.map((file, index) => `l${index}_${c.name}_${theme.name}`).join(', ')}, defaultTheme)`).join('\n')}
const themes = {
  default: defaultTheme
}
${c.imports.variations.filter((theme) => (variations.indexOf(theme.name) !== -1)).map((theme) => `themes['${theme.name}'] = ${theme.name}`).join('\n')}
export default themes`
        }
      }
      addTemplate(template)
    } 

    // write available tailwind colors
    const template: NuxtTemplate = {
      filename: `theme/_colors.ts`,
      write: true,
      getContents: async () => {
        return `export default ${JSON.stringify(colors)}`
      }
    }
    addTemplate(template)

}

function _resolveId (id: string) {
  return resolvePath(id, {
    url: [
      // @ts-ignore
      global.__NUXT_PREPATHS__,
      import.meta.url,
      process.cwd(),
      // @ts-ignore
      global.__NUXT_PATHS__
    ]
  })
}