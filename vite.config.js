import { defineConfig } from 'vite'
import glsl from 'vite-plugin-glsl'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

async function discoverHtmlPages(directory, relative = '') {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const pages = []
  for (const entry of entries) {
    if (entry.name.startsWith('.') || ['node_modules', 'dist', 'public'].includes(entry.name)) continue
    const entryRelative = path.posix.join(relative, entry.name)
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) pages.push(...await discoverHtmlPages(absolute, entryRelative))
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html') && entry.name !== 'editor.html') {
      pages.push(`/${entryRelative.replaceAll(path.sep, '/')}`)
    }
  }
  return pages
}

function visualEditorSavePlugin() {
  return {
    name: 'visual-editor-save',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const route = request.url?.split('?')[0]
        if (!route?.startsWith('/__visual-editor/')) return next()

        const sendJson = (status, value) => {
          response.writeHead(status, { 'Content-Type': 'application/json' })
          response.end(JSON.stringify(value))
        }

        async function resolvePage(rawPage) {
          const page = rawPage || '/index.html'
          if (!page.startsWith('/') || page.includes('\\') || page.includes('\0')) return null
          const normalized = `/${path.posix.normalize(page).replace(/^\/+/, '')}`
          if (normalized.includes('/../') || normalized.endsWith('/..')) return null
          const pages = await discoverHtmlPages(process.cwd())
          return pages.includes(normalized) ? normalized : null
        }

        function editsFileFor(page) {
          if (page === '/index.html') return path.resolve(process.cwd(), 'public', 'visual-edits.json')
          return path.resolve(process.cwd(), 'public', 'visual-edits', `${page.replace(/^\//, '')}.json`)
        }

        const projectsFile = path.resolve(process.cwd(), 'public', 'projects.json')

        async function readProjects() {
          try {
            const value = JSON.parse(await fs.readFile(projectsFile, 'utf8'))
            return Array.isArray(value) ? value : []
          } catch (error) {
            if (error.code === 'ENOENT') return []
            throw error
          }
        }

        function readJsonBody(request, limit = 8_000_000) {
          return new Promise((resolve, reject) => {
            let body = ''
            request.setEncoding('utf8')
            request.on('data', (chunk) => {
              body += chunk
              if (body.length > limit) reject(new Error('Request data is too large.'))
            })
            request.on('end', () => {
              try { resolve(JSON.parse(body)) } catch { reject(new Error('Request body must be valid JSON.')) }
            })
            request.on('error', reject)
          })
        }

        function slugify(value) {
          return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
            .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
        }

        function escapeHtml(value) {
          return String(value).replace(/[&<>"']/g, (character) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
          })[character])
        }

        if (route === '/__visual-editor/projects' && request.method === 'GET') {
          readProjects().then((projects) => sendJson(200, { projects }))
            .catch((error) => sendJson(500, { error: error.message }))
          return
        }

        if (route === '/__visual-editor/projects' && request.method === 'POST') {
          const origin = request.headers.origin
          const host = request.headers.host
          if (!origin || new URL(origin).host !== host) {
            response.writeHead(403).end('Same-origin requests only')
            return
          }
          readJsonBody(request, 100_000).then(async (payload) => {
            const title = String(payload.title || '').trim()
            if (!title) throw new Error('Enter a project name.')
            const projects = await readProjects()
            const baseId = slugify(title)
            if (!baseId) throw new Error('Use a project name with letters or numbers.')
            const id = projects.some((project) => project.id === baseId) ? `${baseId}-${Date.now().toString(36)}` : baseId
            const detailsPage = Boolean(payload.detailsPage)
            const category = ['ux-ui', 'branding', 'motion-graphics'].includes(payload.category) ? payload.category : 'ux-ui'
            const safeImage = String(payload.image || '').trim()
            if (safeImage && !(/^(https?:\/\/|\/assets\/|\/uploads\/)/i.test(safeImage))) {
              throw new Error('Image must be a website URL or a path inside /assets or /uploads.')
            }
            const project = {
              id, title,
              headline: String(payload.headline || '').trim() || title,
              category,
              scope: String(payload.scope || '').trim() || 'Project',
              role: String(payload.role || '').trim() || 'Design',
              client: String(payload.client || '').trim() || title,
              year: String(payload.year || '').trim() || String(new Date().getFullYear()),
              summary: String(payload.summary || '').trim() || `A selected project by ${title}.`,
              overview: String(payload.summary || '').trim() || `An overview of ${title}. Edit this text in the visual editor.`,
              challenge: `Describe the challenge for ${title}. Edit this text in the visual editor.`,
              approach: `Describe the approach for ${title}. Edit this text in the visual editor.`,
              outcome: `Describe the outcome for ${title}. Edit this text in the visual editor.`,
              image: safeImage || null,
              alt: `${title} project preview`,
              hue: 220,
              detailsPage,
            }
            if (detailsPage) {
              const pagePath = path.resolve(process.cwd(), 'projects', `${id}.html`)
              try { await fs.access(pagePath); throw new Error('A page already uses this project name. Change the project name and try again.') }
              catch (error) { if (error.code !== 'ENOENT') throw error }
              const templatePath = path.resolve(process.cwd(), 'projects', 'horizon-banking.html')
              const template = await fs.readFile(templatePath, 'utf8')
              const html = template.replace('data-project-id="horizon-banking"', `data-project-id="${escapeHtml(id)}"`)
              await fs.writeFile(pagePath, html, 'utf8')
            }
            projects.push(project)
            await fs.mkdir(path.dirname(projectsFile), { recursive: true })
            await fs.writeFile(projectsFile, `${JSON.stringify(projects, null, 2)}\n`, 'utf8')
            sendJson(201, { project, page: detailsPage ? `/projects/${id}.html` : null })
          }).catch((error) => sendJson(400, { error: error.message }))
          return
        }

        if (route === '/__visual-editor/pages' && request.method === 'GET') {
          discoverHtmlPages(process.cwd()).then((pages) => {
            const ordered = pages.sort((left, right) => left === '/index.html' ? -1 : right === '/index.html' ? 1 : left.localeCompare(right))
            sendJson(200, { pages: ordered.map((page) => ({
              path: page,
              label: page === '/index.html' ? 'Home' : page.replace(/^\//, '').replace(/\.html$/i, '').split('/').map((part) => part.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())).join(' / '),
            })) })
          }).catch((error) => sendJson(500, { error: error.message }))
          return
        }

        if (route === '/__visual-editor/edits' && request.method === 'GET') {
          const url = new URL(request.url, 'http://localhost')
          resolvePage(url.searchParams.get('page')).then(async (page) => {
            if (!page) return sendJson(404, { error: 'Page not found' })
            try {
              const contents = await fs.readFile(editsFileFor(page), 'utf8')
              sendJson(200, JSON.parse(contents))
            } catch (error) {
              if (error.code === 'ENOENT') return sendJson(200, {})
              sendJson(500, { error: error.message })
            }
          }).catch((error) => sendJson(500, { error: error.message }))
          return
        }

        if (route !== '/__visual-editor/save') return next()
        if (request.method !== 'POST') return sendJson(405, { error: 'Method not allowed' })

        const origin = request.headers.origin
        const host = request.headers.host
        if (!origin || new URL(origin).host !== host) {
          response.writeHead(403).end('Same-origin requests only')
          return
        }

        let body = ''
        request.setEncoding('utf8')
        request.on('data', (chunk) => {
          body += chunk
          if (body.length > 8_000_000) {
            response.writeHead(413).end('Editor data is too large')
            request.destroy()
          }
        })
        request.on('end', async () => {
          try {
            const payload = JSON.parse(body)
            const page = await resolvePage(payload.page)
            const edits = payload.edits
            if (!page) throw new Error('The selected page is not available.')
            if (!edits || typeof edits !== 'object' || Array.isArray(edits)) {
              throw new Error('Expected an edits object')
            }
            const editsPath = editsFileFor(page)
            await fs.mkdir(path.dirname(editsPath), { recursive: true })
            await fs.writeFile(editsPath, `${JSON.stringify(edits, null, 2)}\n`, 'utf8')
            sendJson(200, { saved: true, page })
          } catch (error) {
            sendJson(400, { error: error.message })
          }
        })
      })
    },
  }
}

export default defineConfig(async () => {
  const pages = await discoverHtmlPages(process.cwd())
  const input = Object.fromEntries(pages.map((page) => [page.replace(/^\//, '').replace(/\.html$/i, ''), path.resolve(process.cwd(), `.${page}`)]))
  return {
    base: process.env.VITE_BASE_PATH || '/',
    plugins: [glsl(), visualEditorSavePlugin()],
    build: { rollupOptions: { input } },
    optimizeDeps: {
      noDiscovery: true,
      include: [],
    },
  }
})
