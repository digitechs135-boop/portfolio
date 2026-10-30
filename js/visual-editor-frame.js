if (new URLSearchParams(window.location.search).has('visual-edit')) {
  const editorOrigin = window.location.origin
  const style = document.createElement('style')
  style.textContent = `
    html.visual-edit-mode, html.visual-edit-mode body { cursor: crosshair !important; }
    html.visual-edit-mode body * { cursor: crosshair !important; }
    .visual-edit-hover { outline: 2px solid #d9df9a !important; outline-offset: 2px !important; }
    [contenteditable="true"].visual-edit-active { outline: 2px solid #d9df9a !important; outline-offset: 3px !important; cursor: text !important; }
  `
  document.head.append(style)

  let mode = 'text'
  let hovered = null
  let saveTimer = 0
  let pendingTextElement = null

  function selectorFor(element) {
    if (element.id) return `#${CSS.escape(element.id)}`
    const parts = []
    let current = element
    while (current && current !== document.body) {
      let part = current.tagName.toLowerCase()
      const className = [...current.classList].find((name) => /^[\w-]+$/.test(name))
      if (className) part += `.${CSS.escape(className)}`
      const siblings = current.parentElement
        ? [...current.parentElement.children].filter((child) => child.tagName === current.tagName)
        : []
      if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(current) + 1})`
      parts.unshift(part)
      if (current.parentElement?.id) {
        parts.unshift(`#${CSS.escape(current.parentElement.id)}`)
        break
      }
      current = current.parentElement
    }
    return parts.join(' > ')
  }

  function textTarget(target) {
    return target.closest('h1, h2, h3, h4, p, span, strong, small, a, dd, dt, li, button, label')
  }

  function sectionTarget(target) {
    let element = target instanceof Element ? target : null
    while (element && element.parentElement !== document.body) element = element.parentElement
    return element?.matches('section, footer') ? element : null
  }

  function mediaTargetAt(x, y) {
    const candidates = document.elementsFromPoint(x, y)
      .map((element) => element.closest('img, video, .project-card__placeholder, .hero__portrait-placeholder, .case-study__media--placeholder'))
      .filter(Boolean)
      .filter((element, index, all) => all.indexOf(element) === index)
      .map((element) => ({ element, opacity: Number.parseFloat(getComputedStyle(element).opacity) || 0 }))
      .sort((left, right) => right.opacity - left.opacity)
    return candidates[0]?.element ?? null
  }

  function post(message) {
    window.parent.postMessage({ source: 'portfolio-visual-editor', ...message }, editorOrigin)
  }

  function postTextSelection(element) {
    const computed = getComputedStyle(element)
    post({
      type: 'selected',
      selector: selectorFor(element),
      styles: { fontSize: computed.fontSize, color: computed.color },
      label: element.textContent.trim().replace(/\s+/g, ' ').slice(0, 80) || 'Text element',
    })
  }

  function applyTypography(element, properties) {
    if (typeof properties?.fontSize === 'string' && /^\d+(?:\.\d+)?px$/.test(properties.fontSize)) {
      element.style.fontSize = properties.fontSize
    }
    if (typeof properties?.color === 'string' && CSS.supports('color', properties.color)) {
      element.style.color = properties.color
    }
  }

  function setHovered(element) {
    if (hovered === element) return
    hovered?.classList.remove('visual-edit-hover')
    hovered = element
    hovered?.classList.add('visual-edit-hover')
  }

  function applyEdits(edits) {
    Object.entries(edits.text ?? {}).forEach(([selector, html]) => {
      const element = document.querySelector(selector)
      if (element && typeof html === 'string') element.innerHTML = html
    })
    Object.entries(edits.media ?? {}).forEach(([selector, media]) => {
      const element = document.querySelector(selector)
      if (!element || !media?.value) return
      if (media.kind === 'background') element.style.backgroundImage = `url("${media.value}")`
      else if (element instanceof HTMLImageElement) element.src = media.value
    })
    Object.entries(edits.theme ?? {}).forEach(([variable, value]) => {
      document.documentElement.style.setProperty(variable, value)
    })
    Object.entries(edits.spacing ?? {}).forEach(([selector, value]) => {
      const element = document.querySelector(selector)
      const pixels = Number(value)
      if (element && Number.isFinite(pixels)) element.style.marginBottom = `${pixels}px`
    })
    Object.entries(edits.typography ?? {}).forEach(([selector, properties]) => {
      const element = document.querySelector(selector)
      if (element) applyTypography(element, properties)
    })
  }

  function flushTextChange(element) {
    if (!element || pendingTextElement !== element) return
    window.clearTimeout(saveTimer)
    pendingTextElement = null
    post({ type: 'change', bucket: 'text', selector: selectorFor(element), value: element.innerHTML })
    postTextSelection(element)
  }

  document.documentElement.classList.add('visual-edit-mode')
  document.addEventListener('pointermove', (event) => {
    const target = mode === 'media'
      ? mediaTargetAt(event.clientX, event.clientY)
      : mode === 'spacing'
        ? sectionTarget(event.target)
        : textTarget(event.target instanceof Element ? event.target : document.body)
    setHovered(target)
  }, true)

  document.addEventListener('click', (event) => {
    if (mode === 'spacing') {
      const element = sectionTarget(event.target)
      if (!element) return
      event.preventDefault()
      event.stopPropagation()
      const label = element.getAttribute('aria-label') || element.querySelector('h1, h2')?.textContent?.trim() || element.id || 'Section'
      post({ type: 'section-selected', selector: selectorFor(element), label })
      return
    }

    if (mode === 'media') {
      const element = mediaTargetAt(event.clientX, event.clientY)
      if (!element) return
      event.preventDefault()
      event.stopPropagation()
      const selector = selectorFor(element)
      const kind = element.matches('.project-card__placeholder, .hero__portrait-placeholder, .case-study__media--placeholder') ? 'background' : 'image'
      post({ type: 'choose-media', selector, kind, label: element.getAttribute('alt') || element.textContent.trim().slice(0, 60) || 'Image' })
      return
    }

    const element = textTarget(event.target instanceof Element ? event.target : document.body)
    if (!element) return
    event.preventDefault()
    event.stopPropagation()
    element.contentEditable = 'true'
    element.classList.add('visual-edit-active')
    element.focus()
    const selector = selectorFor(element)
    postTextSelection(element)
    post({ type: 'begin-edit', selector, styles: {
      fontSize: getComputedStyle(element).fontSize,
      color: getComputedStyle(element).color,
    } })
    try {
      const range = document.caretRangeFromPoint?.(event.clientX, event.clientY)
      const selection = window.getSelection()
      if (range && selection) {
        selection.removeAllRanges()
        selection.addRange(range)
      }
    } catch (error) {
      console.debug('Text cursor placement was skipped.', error)
    }
  }, true)

  document.addEventListener('input', (event) => {
    if (!(event.target instanceof HTMLElement) || event.target.contentEditable !== 'true') return
    pendingTextElement = event.target
    window.clearTimeout(saveTimer)
    saveTimer = window.setTimeout(() => flushTextChange(pendingTextElement), 400)
  }, true)

  document.addEventListener('focusout', (event) => {
    const element = event.target
    if (!(element instanceof HTMLElement) || element.contentEditable !== 'true') return
    flushTextChange(element)
    post({ type: 'end-edit' })
    element.contentEditable = 'false'
    element.classList.remove('visual-edit-active')
  }, true)

  window.addEventListener('message', (event) => {
    if (event.source !== window.parent || event.origin !== editorOrigin) return
    const message = event.data
    if (message?.type === 'set-mode') {
      mode = ['media', 'spacing'].includes(message.mode) ? message.mode : 'text'
      document.querySelectorAll('[contenteditable="true"]').forEach((element) => {
        flushTextChange(element)
        post({ type: 'end-edit' })
        element.contentEditable = 'false'
        element.classList.remove('visual-edit-active')
      })
      post({ type: 'mode-ready', mode })
    } else if (message?.type === 'apply-media') {
      const element = document.querySelector(message.selector)
      if (!element) return
      if (message.kind === 'background') element.style.backgroundImage = `url("${message.value}")`
      else if (element instanceof HTMLImageElement) {
        element.src = message.value
        element.removeAttribute('srcset')
      }
      post({ type: 'change', bucket: 'media', selector: message.selector, value: { kind: message.kind, value: message.value } })
    } else if (message?.type === 'apply-theme') {
      document.documentElement.style.setProperty(message.variable, message.value)
      post({ type: 'change', bucket: 'theme', selector: message.variable, value: message.value })
    } else if (message?.type === 'apply-spacing') {
      const element = document.querySelector(message.selector)
      const pixels = Number(message.value)
      if (element && Number.isFinite(pixels)) {
        element.style.marginBottom = `${pixels}px`
        post({ type: 'change', bucket: 'spacing', selector: message.selector, value: pixels })
      }
    } else if (message?.type === 'apply-typography') {
      const element = document.querySelector(message.selector)
      if (!element) return
      applyTypography(element, message.properties)
    } else if (message?.type === 'apply-edits') {
      Promise.all([window.projectCatalogReady, window.projectDetailsReady])
        .then(() => applyEdits(message.edits))
    }
  })
}
