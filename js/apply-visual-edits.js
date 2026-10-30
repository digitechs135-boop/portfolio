async function applyVisualEdits() {
  if (new URLSearchParams(window.location.search).has('visual-edit')) return
  try {
    await window.projectCatalogReady
    const page = window.location.pathname === '/' ? '/index.html' : window.location.pathname
    const editFile = page === '/index.html'
      ? '/visual-edits.json'
      : `/visual-edits/${page.replace(/^\//, '')}.json`
    const response = await fetch(editFile, { cache: 'no-store' })
    if (!response.ok) return
    const edits = await response.json()

    Object.entries(edits.text ?? {}).forEach(([selector, html]) => {
      const element = document.querySelector(selector)
      if (element && typeof html === 'string') element.innerHTML = html
    })

    Object.entries(edits.media ?? {}).forEach(([selector, media]) => {
      const element = document.querySelector(selector)
      if (!element || !media?.value) return
      if (media.kind === 'background') element.style.backgroundImage = `url("${media.value}")`
      else if (element instanceof HTMLImageElement) {
        element.src = media.value
        element.removeAttribute('srcset')
      }
    })

    Object.entries(edits.theme ?? {}).forEach(([variable, value]) => {
      if (/^--[\w-]+$/.test(variable) && typeof value === 'string') {
        document.documentElement.style.setProperty(variable, value)
      }
    })

    Object.entries(edits.spacing ?? {}).forEach(([selector, value]) => {
      const element = document.querySelector(selector)
      const pixels = Number(value)
      if (element && Number.isFinite(pixels)) element.style.marginBottom = `${pixels}px`
    })

    Object.entries(edits.typography ?? {}).forEach(([selector, style]) => {
      const element = document.querySelector(selector)
      if (!element) return
      if (typeof style.fontSize === 'string' && /^\d+(?:\.\d+)?px$/.test(style.fontSize)) {
        element.style.fontSize = style.fontSize
      }
      if (typeof style.color === 'string' && CSS.supports('color', style.color)) {
        element.style.color = style.color
      }
    })
  } catch (error) {
    console.warn('Saved visual edits could not be loaded.', error)
  }
}

applyVisualEdits()
