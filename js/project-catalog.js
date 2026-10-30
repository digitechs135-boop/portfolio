const siteBase = import.meta.env.BASE_URL

function addProjectCard(project, grid) {
  if (grid.querySelector(`[data-new-project-id="${CSS.escape(project.id)}"]`)) return

  const card = document.createElement('article')
  card.className = 'project-card project-card--catalog'
  card.dataset.newProjectId = project.id
  card.dataset.category = project.category || 'ux-ui'

  const link = project.detailsPage
    ? document.createElement('a')
    : document.createElement('div')
  link.className = 'project-card__link'
  if (project.detailsPage) {
    link.href = `${siteBase}projects/${encodeURIComponent(project.id)}.html`
    link.setAttribute('aria-label', `View ${project.title} details`)
  }

  const imageWrap = document.createElement('div')
  imageWrap.className = 'project-card__image-wrap'
  if (project.image) {
    const image = document.createElement('img')
    image.src = project.image?.startsWith('/') ? `${siteBase}${project.image.slice(1)}` : project.image
    image.alt = `${project.title} project preview`
    image.loading = 'lazy'
    imageWrap.append(image)
  } else {
    const placeholder = document.createElement('div')
    placeholder.className = 'project-card__placeholder'
    placeholder.style.setProperty('--ph-hue', String(project.hue || 220))
    imageWrap.append(placeholder)
  }

  const info = document.createElement('div')
  info.className = 'project-card__info'
  const meta = document.createElement('div')
  meta.className = 'project-card__meta'
  const category = document.createElement('span')
  category.className = 'project-card__tag'
  category.textContent = project.category === 'motion-graphics' ? 'Motion Graphics' : project.category === 'branding' ? 'Branding' : 'UX/UI'
  const scope = document.createElement('span')
  scope.className = 'project-card__tag'
  scope.textContent = project.scope || 'Project'
  const year = document.createElement('span')
  year.className = 'project-card__year'
  year.textContent = project.year || ''
  meta.append(category, scope, year)

  const title = document.createElement('h3')
  title.className = 'project-card__title'
  title.textContent = project.title
  const description = document.createElement('p')
  description.className = 'project-card__desc'
  description.textContent = project.summary || ''
  info.append(meta, title, description)
  link.append(imageWrap, info)
  card.append(link)
  grid.append(card)
}

async function loadProjectCatalog() {
  const grids = Array.from(document.querySelectorAll('.works__grid'))
  if (!grids.length) return
  try {
    const response = await fetch(`${siteBase}projects.json`, { cache: 'no-store' })
    if (!response.ok) return
    const projects = await response.json()
    if (!Array.isArray(projects)) return
    grids.forEach((grid) => projects.forEach((project) => addProjectCard(project, grid)))
  } catch (error) {
    console.warn('Additional projects could not be loaded.', error)
  }
}

window.projectCatalogReady = loadProjectCatalog()
