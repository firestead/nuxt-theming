import { globby } from 'globby'
import { extname, join } from 'node:path'
import { useLogger } from '@nuxt/kit'
import type { AnalizedThemeFile, ThemeConfig, ThemeDir } from './types'

const logger = useLogger('nuxt:theming')

export async function scanThemeFiles(rootDir: string, themeDir: string) : Promise<AnalizedThemeFile[]> {
  const themeFiles = await globby(`${themeDir}/**/*.{js,ts,json}`, { cwd: rootDir })
  // analyze theme files e.g. to extract the name of the theme from file names -> { path: 'path/to/file/button.admin.json', fileName: 'button.admin.json', name: 'button', theme: 'admin' }
  // if file name has no name part, use the directory name as name if it is not the text directory
  const analyzedThemeFiles = themeFiles
    .filter((file) => {
      const pathElements = file.split("/")
      const themeDirIndex = pathElements.indexOf(themeDir)
      pathElements.splice(0, themeDirIndex + 1)
      return pathElements.length <= 2 && ['.json','.ts','.js'].includes(extname(file))
    })
    .map((file) => {
      const path = file.split("/")
      const fileName = path.pop()
      let theme = ""
      let name = ""
      if (path[path.length - 1] === themeDir) {
        //check if theme is default
        const nameArr = fileName?.split(".") || []
        if (nameArr?.length === 2) {
          theme = 'default'
        } else {
          theme = nameArr[nameArr?.length - 2] || ''
        }
        name = fileName?.split(".")[0] || ''
      } else {
        theme = path[path.length - 1]
        name = fileName?.split(".")[0] || ''
      }

      //check if file path has extension ts and remove it from path
      const filePath = file.endsWith('.ts') ? file.slice(0, -3) : file

      return {
        path: join(rootDir, filePath),
        fileName: fileName || '',
        name,
        theme,
      }
    })
  return analyzedThemeFiles
}

export function createThemeConfig(themeConfig: ThemeConfig[], files: AnalizedThemeFile[]) {
  const defaultThemeFiles = files.filter((file) => file.theme === 'default')
  for(const file of defaultThemeFiles){
    const index = themeConfig.findIndex((c) => c.name === file.name)
    if (index === -1) {
      themeConfig.push({
        name: file.name,
        files: [{
          path: file.path,
          extension: extname(file.fileName)
        }],
        themes: []
      })
    }else{
      themeConfig[index].files.push({
        path: file.path,
        extension: extname(file.fileName)
      })
    }
  }
  //get all other theme names
  const otherThemes = [...new Set(files.filter(file => file.theme !== 'default').map(file => file.theme))]
  for(const theme of otherThemes){
    const themeFiles = files.filter((file) => file.theme === theme)
    for (const file of themeFiles) {
      const index = themeConfig.findIndex((c) => c.name === file.name)
      if (index !== -1) {
        //check if theme is already in files array and add it if not
        const themeIndex = themeConfig[index].themes.findIndex(
          (fileConfig) => fileConfig.name === file.name
        )
        if (themeIndex !== -1) {
          themeConfig[index].themes[themeIndex].files.push({
            path: file.path,
            extension: extname(file.fileName)
          })
        } else {
          themeConfig[index].themes.push({
            name: file.theme,
            files: [{
              path: file.path,
              extension: extname(file.fileName)
            }],
          })
        }
      } else {
        logger.warn(`You have to define a default theme file for '${file.name}' before you can add this file for theme '${file.theme}'.`)
      }
    }
  }
}

export function orderThemeDirsByPriority(themeDirs: ThemeDir[]): ThemeDir[] {
  // Set priority to 0 for any items without a priority property
  const themeDirsWithPriority = themeDirs.map(themeDir => ({
    ...themeDir,
    priority: themeDir.priority || 0,
  }));

  // Sort items by priority in descending order
  return themeDirsWithPriority.sort((a, b) => b.priority - a.priority);
}