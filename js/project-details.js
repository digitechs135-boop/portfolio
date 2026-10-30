const siteBase = import.meta.env.BASE_URL
const sitePath = (path) => `${siteBase}${String(path).replace(/^\/+/, '')}`

const projects = [
  {
    id: 'horizon-banking',
    title: 'Horizon Banking',
    headline: 'A clearer banking experience for everyday money.',
    scope: 'Web App',
    role: 'UX/UI Design',
    client: 'Horizon Banking',
    year: '2024',
    summary: 'A digital banking experience focused on making account information, onboarding, and everyday transactions easier to understand.',
    overview: 'Horizon Banking brings key account tasks into one considered product experience. The work focuses on a clear account overview, straightforward transaction flows, and account management that is easier to navigate.',
    challenge: 'Banking tools can make simple tasks feel dense. Important balances and actions need to be easy to find without hiding the detail people rely on to make decisions.',
    approach: 'The experience was reorganized around a clear information hierarchy. Onboarding, transaction details, and account controls were treated as parts of one consistent system, with accessible patterns across the product.',
    outcome: 'The result is a calmer banking interface that gives everyday tasks a clear place and makes the larger account picture easier to scan.',
    image: sitePath('/assets/project-spending.png'),
    alt: 'Financial dashboard project visual',
    hue: 218,
  },
  {
    id: 'pulse-fitness',
    title: 'Pulse Fitness',
    headline: 'A more personal way to build healthy routines.',
    scope: 'Mobile App',
    role: 'Product Design',
    client: 'Pulse Fitness',
    year: '2024',
    summary: 'An end-to-end health and fitness app for workout plans, nutrition logging, and social challenges.',
    overview: 'Pulse Fitness brings planning, activity, and progress into one mobile experience. The product helps people shape a routine that feels personal, then gives them a simple way to check in as they go.',
    challenge: 'Fitness products can overwhelm people with dashboards and disconnected tracking. The experience needed to make regular actions feel approachable while still supporting individual goals.',
    approach: 'The design connects workout planning, nutrition logging, and community challenges through a consistent set of mobile patterns. Progress is presented in context, keeping the next useful action easy to reach.',
    outcome: 'Pulse Fitness offers a more joined-up product experience for planning workouts, recording nutrition, and staying connected to personal progress.',
    image: sitePath('/assets/project-weather.png'),
    alt: 'Mobile product design project visual',
    hue: 278,
  },
  {
    id: 'verdant-botanics',
    title: 'Verdant Botanics',
    headline: 'A thoughtful identity and storefront for plant care.',
    scope: 'Brand Identity & E-Commerce',
    role: 'Brand and Web Design',
    client: 'Verdant Botanics',
    year: '2023',
    summary: 'A complete brand identity and Shopify storefront for a sustainable plant-care startup.',
    overview: 'Verdant Botanics pairs a distinctive visual identity with a direct-to-customer storefront. The work connects the brand’s sustainable plant-care focus to the way products are discovered and purchased.',
    challenge: 'A growing plant-care range needs to feel credible, welcoming, and easy to browse. The brand and store needed to work together so that product information stayed clear at every step.',
    approach: 'The identity system sets a consistent visual direction across the logo, typography, and color. The storefront carries that direction into product discovery and checkout, with a straightforward shopping flow.',
    outcome: 'The resulting brand and Shopify experience give Verdant Botanics a cohesive foundation across its digital presence and customer journey.',
    image: null,
    alt: 'Verdant Botanics project image placeholder',
    hue: 150,
  },
  {
    id: 'atlas-analytics',
    title: 'Atlas Analytics',
    headline: 'Making complex data easier to explore and share.',
    scope: 'SaaS Platform',
    role: 'UX/UI Design',
    client: 'Atlas Analytics',
    year: '2023',
    summary: 'A real-time data visualization platform for enterprise teams, including interactive charts and custom reporting.',
    overview: 'Atlas Analytics helps teams move from live data to useful decisions. The platform combines dashboards, interactive charts, and report building in a workspace designed for different roles and needs.',
    challenge: 'Enterprise analytics can become difficult to scan as data and reporting needs grow. Teams need enough detail to investigate results without losing the overall picture.',
    approach: 'The dashboard structure puts the most useful signals first, while interactive charts and a custom report builder support deeper exploration. Role-based views keep the experience relevant to each team.',
    outcome: 'Atlas gives enterprise teams a clearer path from reviewing live data to building and sharing the reports they need.',
    image: sitePath('/assets/project-spending.png'),
    alt: 'Analytics dashboard project visual',
    hue: 22,
  },
  {
    id: 'neon-studios',
    title: 'Neon Studios',
    headline: 'A distinctive identity with a flexible motion language.',
    scope: 'Identity & Motion',
    role: 'Art Direction',
    client: 'Neon Studios',
    year: '2023',
    summary: 'Art direction and a visual identity system for a creative agency, including typography, motion, and brand collateral.',
    overview: 'Neon Studios needed an identity that could feel expressive across still and moving formats. The project brings the agency’s art direction, logo system, and visual language into one flexible toolkit.',
    challenge: 'A creative agency’s identity has to work across very different contexts, from a small digital mark to larger campaign and motion pieces, while remaining recognizable.',
    approach: 'The visual direction combines a considered logo system with typography rules and a motion language. These pieces are designed to work together across the agency’s digital presence and brand collateral.',
    outcome: 'The system gives Neon Studios a consistent identity with room for its work to shift in scale, format, and motion.',
    image: null,
    alt: 'Neon Studios project image placeholder',
    hue: 338,
  },
  {
    id: 'wanderlust-travel',
    title: 'Wanderlust Travel',
    headline: 'A smoother journey from trip ideas to booking.',
    scope: 'Booking Platform',
    role: 'Web Design',
    client: 'Wanderlust Travel',
    year: '2022',
    summary: 'A responsive travel booking website with itinerary planning, hotel comparisons, and a multi-step checkout flow.',
    overview: 'Wanderlust Travel brings destination discovery and trip planning into a responsive booking experience. People can compare stays, shape an itinerary, and move through checkout in a connected flow.',
    challenge: 'Travel planning often involves comparing options across many pages and keeping track of details along the way. The experience needed to make those decisions feel more connected.',
    approach: 'The website organizes discovery, hotel comparison, and itinerary planning into a clear sequence. A guided multi-step checkout carries the selected trip details through to booking.',
    outcome: 'The final experience gives travelers a more continuous path from exploring a destination to completing a booking.',
    image: sitePath('/assets/project-world-clock.png'),
    alt: 'Travel planning interface project visual',
    hue: 48,
  },
]

const project = projects.find(({ id }) => id === document.body.dataset.projectId)
const content = document.getElementById('projectContent')

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character])
}

function mediaMarkup(image, alt, hue, className = '') {
  if (image) {
    const source = image.startsWith('/') ? sitePath(image) : image
    return `<figure class="case-study__media ${className}"><img src="${escapeHtml(source)}" alt="${escapeHtml(alt)}" loading="lazy" /></figure>`
  }
  return `<div class="case-study__media case-study__media--placeholder ${className}" style="--media-hue:${Number(hue) || 220}" role="img" aria-label="${escapeHtml(alt)}"></div>`
}

function renderProjectPage(project, allProjects) {
  if (!content) return
  const projectIndex = allProjects.findIndex(({ id }) => id === project.id)
  const otherProjects = allProjects.filter(({ id, detailsPage }) => id !== project.id && detailsPage !== false).slice(0, 3)
  const heroMedia = mediaMarkup(project.image, project.alt, project.hue, 'case-study__hero-media')
  const galleryMedia = [0, 1].map((index) => mediaMarkup(
    project.image,
    `${project.title} design detail ${index + 1}`,
    project.hue,
    'case-study__gallery-media'
  )).join('')
  const approachMedia = mediaMarkup(project.image, `${project.title} project presentation`, project.hue, 'case-study__feature-media')

  const title = escapeHtml(project.title)
  document.title = `${project.title} — Alex Mercer`
  document.querySelector('meta[name="description"]')?.setAttribute('content', project.summary || '')
  content.innerHTML = `
    <header class="case-study__intro">
      <p class="case-study__eyebrow reveal-up">SELECTED WORK / ${String(projectIndex + 1).padStart(2, '0')}</p>
      <h1 class="case-study__headline reveal-up">${escapeHtml(project.headline || title)}</h1>
      <div class="case-study__meta reveal-up">
        <div><span>Scope</span><strong>${escapeHtml(project.scope)}</strong></div>
        <div><span>Role</span><strong>${escapeHtml(project.role)}</strong></div>
        <div><span>Client</span><strong>${escapeHtml(project.client)}</strong></div>
        <div><span>Year</span><strong>${escapeHtml(project.year)}</strong></div>
      </div>
    </header>

    ${heroMedia}

    <section class="case-study__text-section reveal-up" aria-labelledby="overview-title">
      <h2 id="overview-title">Overview</h2>
      <div class="case-study__copy"><p>${escapeHtml(project.overview || project.summary)}</p><p>${escapeHtml(project.summary)}</p></div>
    </section>

    <div class="case-study__gallery">${galleryMedia}</div>

    <section class="case-study__text-section case-study__text-section--split reveal-up" aria-labelledby="challenge-title">
      <h2 id="challenge-title">Challenge</h2>
      <div class="case-study__copy"><p>${escapeHtml(project.challenge || '')}</p><p>The work called for a clear visual system and an experience that could support the needs of the project from first impression through its core tasks.</p></div>
    </section>

    <div class="case-study__gallery case-study__gallery--offset">
      ${mediaMarkup(project.image, `${project.title} interface detail`, project.hue, 'case-study__gallery-media')}
      ${mediaMarkup(project.image, `${project.title} visual detail`, project.hue + 18, 'case-study__gallery-media')}
    </div>

    <section class="case-study__text-section case-study__text-section--full reveal-up" aria-labelledby="approach-title">
      <h2 id="approach-title">Approach</h2>
      <div class="case-study__copy"><p>${escapeHtml(project.approach || '')}</p><p>Across the work, the visual direction and interface patterns were shaped to feel consistent, legible, and ready to grow with the project.</p></div>
    </section>

    ${approachMedia}

    <section class="case-study__text-section reveal-up" aria-labelledby="outcome-title">
      <h2 id="outcome-title">Outcome</h2>
      <div class="case-study__copy"><p>${escapeHtml(project.outcome || '')}</p><p>The final work brings the project’s core experience into a cohesive system that is easier to understand, use, and build on.</p></div>
    </section>

    <section class="case-study__more reveal-up" aria-labelledby="more-projects-title">
      <h2 id="more-projects-title">More projects</h2>
      <div class="case-study__more-grid">
        ${otherProjects.map((item) => `
          <a class="case-study__more-card" href="${sitePath(`/projects/${item.id}.html`)}">
            ${mediaMarkup(item.image, `${item.title} project preview`, item.hue, 'case-study__more-image')}
            <span>${escapeHtml(item.title)}</span><small>${escapeHtml(item.scope)}</small>
          </a>
        `).join('')}
      </div>
    </section>
  `
}

if (project && content) {
  window.projectDetailsReady = fetch(sitePath('/projects.json'), { cache: 'no-store' })
    .then((response) => response.ok ? response.json() : [])
    .catch(() => [])
    .then((catalog) => renderProjectPage(project, [...projects, ...(Array.isArray(catalog) ? catalog : [])]))
} else if (content) {
  content.innerHTML = '<section class="case-study__intro"><p class="case-study__eyebrow">SELECTED WORK</p><h1 class="case-study__headline">Loading project…</h1></section>'
  window.projectDetailsReady = fetch(sitePath('/projects.json'), { cache: 'no-store' })
    .then((response) => response.ok ? response.json() : [])
    .then((catalog) => {
      const addedProjects = Array.isArray(catalog) ? catalog : []
      const addedProject = addedProjects.find(({ id }) => id === document.body.dataset.projectId)
      if (addedProject) renderProjectPage(addedProject, [...projects, ...addedProjects])
      else content.innerHTML = `<section class="case-study__intro"><h1 class="case-study__headline">Project not found</h1><a href="${sitePath('/work.html')}">Back to all work</a></section>`
    })
    .catch(() => {
      content.innerHTML = '<section class="case-study__intro"><h1 class="case-study__headline">Project not found</h1><a href="/work.html">Back to all work</a></section>'
    })
}
