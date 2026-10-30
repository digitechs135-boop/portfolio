const iframe = document.getElementById('sitePreview')
const status = document.getElementById('saveStatus')
const selectedElement = document.getElementById('selectedElement')
const modeTitle = document.getElementById('modeTitle')
const modeHelp = document.getElementById('modeHelp')
const mediaPicker = document.getElementById('mediaPicker')
const resetButton = document.getElementById('resetEdits')
const spacingControls = document.getElementById('spacingControls')
const spacingHelp = document.getElementById('spacingHelp')
const saveButton = document.getElementById('saveEdits')
const undoButton = document.getElementById('undoEdit')
const pageSelect = document.getElementById('pageSelect')
const textColorInput = document.getElementById('selectedTextColor')
const fontSizeInput = document.getElementById('selectedFontSize')
const fontSizeOutput = document.getElementById('selectedFontSizeValue')
const textStyleHelp = document.getElementById('textStyleHelp')
const addProjectForm = document.getElementById('addProjectForm')
const addProjectStatus = document.getElementById('addProjectStatus')
const origin = window.location.origin
const emptyEdits = () => ({ text: {}, media: {}, theme: {}, spacing: {}, typography: {} })
let edits = emptyEdits()
let savedEdits = emptyEdits()
let undoStack = []
let pendingMedia = null
let currentSection = null
let currentMode = 'text'
let activeUndoGroup = null
let isSaving = false
let isLoadingPage = false
let activePage = '/index.html'
let pageLoadToken = 0
let selectedTextSelector = null
let selectedTextStyles = {}

const helpCopy = {
  text: {
    title: 'Edit text',
    help: 'Choose this tool, then click any heading, paragraph, or label in the preview. Type directly on the page; changes stay as a draft until you save.',
  },
  media: {
    title: 'Replace image',
    help: 'Choose this tool, click a banner or project image in the preview, then pick a replacement image from your computer.',
  },
  spacing: {
    title: 'Section spacing',
    help: 'Choose this tool, then click a section in the preview. Its spacing control will appear in this panel.',
  },
}

function cloneEdits(value) {
  return JSON.parse(JSON.stringify(value))
}

function isDirty() {
  return JSON.stringify(edits) !== JSON.stringify(savedEdits)
}

function setStatus(message, state = 'saved') {
  status.textContent = message
  status.dataset.state = state
}

function updateActions() {
  const dirty = isDirty()
  saveButton.disabled = !dirty || isSaving
  undoButton.disabled = undoStack.length === 0 || isSaving
  pageSelect.disabled = isSaving || isLoadingPage
  textColorInput.disabled = !selectedTextSelector || isSaving || isLoadingPage
  fontSizeInput.disabled = !selectedTextSelector || isSaving || isLoadingPage
  if (!isSaving) setStatus(dirty ? 'Unsaved changes' : 'All changes saved', dirty ? 'unsaved' : 'saved')
}

function checkpoint(group) {
  if (activeUndoGroup === group) return
  undoStack.push(cloneEdits(edits))
  if (undoStack.length > 60) undoStack.shift()
  activeUndoGroup = group
  updateActions()
}

function endUndoGroup() {
  activeUndoGroup = null
}

function tellFrame(message) {
  iframe.contentWindow?.postMessage(message, origin)
}

function applyDraftToFrame() {
  iframe.contentWindow?.location.reload()
}

function updateThemeInputs() {
  document.querySelectorAll('input[type="color"][data-variable]').forEach((input) => {
    input.value = edits.theme[input.dataset.variable] || input.defaultValue
  })
}

function colorToHex(color) {
  if (/^#[\da-f]{6}$/i.test(color)) return color
  const channels = color.match(/[\d.]+/g)?.slice(0, 3).map(Number)
  if (!channels || channels.length !== 3) return '#ffffff'
  return `#${channels.map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`
}

function updateTextStyleInputs() {
  if (!selectedTextSelector) {
    textColorInput.value = '#ffffff'
    fontSizeInput.value = '32'
    fontSizeOutput.value = '—'
    textStyleHelp.textContent = 'Select Edit text, then click text in the preview to adjust its size and color.'
    return
  }

  const style = edits.typography[selectedTextSelector] || {}
  const fontSize = Number.parseFloat(style.fontSize || selectedTextStyles.fontSize)
  const safeFontSize = Number.isFinite(fontSize) ? fontSize : 32
  fontSizeInput.value = String(Math.max(Number(fontSizeInput.min), Math.min(Number(fontSizeInput.max), Math.round(safeFontSize))))
  fontSizeOutput.value = `${Math.round(safeFontSize)}px`
  textColorInput.value = colorToHex(style.color || selectedTextStyles.color || '#ffffff')
  textStyleHelp.textContent = 'Changes apply to the selected text. Choose another text item to style it separately.'
}

function applySelectedTypography(property, value) {
  if (!selectedTextSelector) return
  const group = `typography:${selectedTextSelector}`
  if (activeUndoGroup !== group) checkpoint(group)
  const style = { ...(edits.typography[selectedTextSelector] || {}), [property]: value }
  edits.typography[selectedTextSelector] = style
  tellFrame({ type: 'apply-typography', selector: selectedTextSelector, properties: { [property]: value } })
  updateTextStyleInputs()
  updateActions()
}

async function saveDraft() {
  if (!isDirty() || isSaving) return
  isSaving = true
  updateActions()
  setStatus('Saving changes…', 'saving')
  const snapshot = cloneEdits(edits)
  try {
    const response = await fetch('/__visual-editor/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: activePage, edits: snapshot }),
    })
    if (!response.ok) throw new Error(await response.text())
    savedEdits = snapshot
    setStatus(isDirty() ? 'Newer changes still unsaved' : 'Changes saved', isDirty() ? 'unsaved' : 'saved')
  } catch (error) {
    setStatus('Save failed. Keep the dev server running and try again.', 'error')
    console.error('Visual editor save failed:', error)
  } finally {
    isSaving = false
    updateActions()
  }
}

function chooseMode(mode) {
  currentMode = mode
  endUndoGroup()
  if (mode !== 'spacing') {
    spacingControls.hidden = true
    spacingControls.replaceChildren()
    spacingHelp.textContent = 'Select Section spacing, then click a section in the preview to show its gap control.'
  }
  document.querySelectorAll('[data-mode]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.mode === mode)
  })
  modeTitle.textContent = helpCopy[mode].title
  modeHelp.textContent = helpCopy[mode].help
  tellFrame({ type: 'set-mode', mode })
}

async function compressImage(file) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1800 / bitmap.width, 1400 / bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.86))
  if (!blob) throw new Error('This image could not be processed.')
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function renderSpacingControl({ selector, label }) {
  currentSection = { selector, label }
  spacingControls.replaceChildren()
  spacingHelp.textContent = `Adjust the gap after ${label}. Negative values tighten it; positive values add space.`
  spacingControls.hidden = false

  const item = document.createElement('label')
  item.className = 'spacing-item'
  const title = document.createElement('span')
  title.textContent = `Space after ${label}`
  const output = document.createElement('output')
  const slider = document.createElement('input')
  slider.type = 'range'
  slider.min = '-160'
  slider.max = '240'
  slider.step = '4'
  slider.value = String(edits.spacing[selector] ?? 0)
  output.value = `${slider.value}px`
  slider.setAttribute('aria-label', `Space after ${label}`)
  const group = `spacing:${selector}`
  slider.addEventListener('pointerdown', () => checkpoint(group))
  slider.addEventListener('keydown', () => checkpoint(group))
  slider.addEventListener('input', () => {
    if (activeUndoGroup !== group) checkpoint(group)
    output.value = `${slider.value}px`
    edits.spacing[selector] = Number(slider.value)
    tellFrame({ type: 'apply-spacing', selector, value: slider.value })
    updateActions()
  })
  slider.addEventListener('change', endUndoGroup)
  item.append(title, output, slider)
  spacingControls.append(item)
  selectedElement.textContent = label
}

document.querySelectorAll('[data-mode]').forEach((button) => {
  button.addEventListener('click', () => chooseMode(button.dataset.mode))
})

document.querySelectorAll('input[type="color"][data-variable]').forEach((input) => {
  const group = `theme:${input.dataset.variable}`
  input.addEventListener('pointerdown', () => checkpoint(group))
  input.addEventListener('keydown', () => checkpoint(group))
  input.addEventListener('input', () => {
    if (activeUndoGroup !== group) checkpoint(group)
    edits.theme[input.dataset.variable] = input.value
    tellFrame({ type: 'apply-theme', variable: input.dataset.variable, value: input.value })
    updateActions()
  })
  input.addEventListener('change', endUndoGroup)
})

textColorInput.addEventListener('pointerdown', () => {
  if (selectedTextSelector) checkpoint(`typography:${selectedTextSelector}`)
})
textColorInput.addEventListener('keydown', () => {
  if (selectedTextSelector) checkpoint(`typography:${selectedTextSelector}`)
})
textColorInput.addEventListener('input', () => applySelectedTypography('color', textColorInput.value))
textColorInput.addEventListener('change', endUndoGroup)

fontSizeInput.addEventListener('pointerdown', () => {
  if (selectedTextSelector) checkpoint(`typography:${selectedTextSelector}`)
})
fontSizeInput.addEventListener('keydown', () => {
  if (selectedTextSelector) checkpoint(`typography:${selectedTextSelector}`)
})
fontSizeInput.addEventListener('input', () => {
  fontSizeOutput.value = `${fontSizeInput.value}px`
  applySelectedTypography('fontSize', `${fontSizeInput.value}px`)
})
fontSizeInput.addEventListener('change', endUndoGroup)

mediaPicker.addEventListener('change', async () => {
  const file = mediaPicker.files?.[0]
  if (!file || !pendingMedia) return
  try {
    const value = await compressImage(file)
    checkpoint(`media:${pendingMedia.selector}`)
    edits.media[pendingMedia.selector] = { kind: pendingMedia.kind, value }
    tellFrame({ type: 'apply-media', selector: pendingMedia.selector, kind: pendingMedia.kind, value })
    updateActions()
  } catch (error) {
    setStatus(error.message || 'Could not open that image.', 'error')
  } finally {
    mediaPicker.value = ''
    pendingMedia = null
  }
})

iframe.addEventListener('load', () => {
  tellFrame({ type: 'set-mode', mode: currentMode })
  tellFrame({ type: 'apply-edits', edits })
})

window.addEventListener('message', (event) => {
  if (event.origin !== origin || event.source !== iframe.contentWindow) return
  const message = event.data
  if (message?.source !== 'portfolio-visual-editor') return

  if (message.type === 'selected') {
    selectedElement.textContent = message.label
    if (message.selector) {
      selectedTextSelector = message.selector
      selectedTextStyles = message.styles || {}
      updateTextStyleInputs()
      updateActions()
    }
  } else if (message.type === 'begin-edit') {
    selectedTextSelector = message.selector
    selectedTextStyles = message.styles || selectedTextStyles
    updateTextStyleInputs()
    updateActions()
    checkpoint(`text:${message.selector}`)
  } else if (message.type === 'end-edit') {
    endUndoGroup()
  } else if (message.type === 'choose-media') {
    selectedTextSelector = null
    selectedTextStyles = {}
    updateTextStyleInputs()
    updateActions()
    pendingMedia = { selector: message.selector, kind: message.kind }
    selectedElement.textContent = message.label || 'Image selected'
    mediaPicker.click()
  } else if (message.type === 'change') {
    const group = `${message.bucket}:${message.selector}`
    if (JSON.stringify(edits[message.bucket][message.selector]) === JSON.stringify(message.value)) return
    if (activeUndoGroup !== group) checkpoint(group)
    edits[message.bucket][message.selector] = message.value
    updateActions()
  } else if (message.type === 'section-selected') {
    selectedTextSelector = null
    selectedTextStyles = {}
    updateTextStyleInputs()
    updateActions()
    renderSpacingControl(message)
  }
})

saveButton.addEventListener('click', saveDraft)

addProjectForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  const submitButton = addProjectForm.querySelector('[type="submit"]')
  const formData = new FormData(addProjectForm)
  const payload = Object.fromEntries(formData.entries())
  payload.detailsPage = formData.has('detailsPage')
  submitButton.disabled = true
  addProjectStatus.textContent = 'Adding project…'
  delete addProjectStatus.dataset.state
  try {
    const response = await fetch('/__visual-editor/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'The project could not be added.')
    addProjectStatus.textContent = result.page
      ? `${result.project.title} added. Its details page is ready to edit.`
      : `${result.project.title} added to Home and Work without a details page.`
    addProjectForm.reset()
    addProjectForm.elements.detailsPage.checked = true
    await refreshPagePicker(activePage)
    if (result.page && !isDirty()) {
      pageSelect.value = result.page
      await loadPageEdits(result.page)
    } else {
      applyDraftToFrame()
    }
  } catch (error) {
    addProjectStatus.textContent = error.message || 'The project could not be added.'
    addProjectStatus.dataset.state = 'error'
  } finally {
    submitButton.disabled = false
  }
})

undoButton.addEventListener('click', () => {
  const previous = undoStack.pop()
  if (!previous) return
  endUndoGroup()
  edits = previous
  updateThemeInputs()
  updateTextStyleInputs()
  if (currentSection && currentMode === 'spacing') renderSpacingControl(currentSection)
  applyDraftToFrame()
  updateActions()
})

resetButton.addEventListener('click', () => {
  if (!window.confirm('Clear all visual edits for this page? You can undo this or save the reset.')) return
  checkpoint('reset')
  edits = emptyEdits()
  currentSection = null
  spacingControls.hidden = true
  spacingControls.replaceChildren()
  spacingHelp.textContent = 'Select Section spacing, then click a section in the preview to show its gap control.'
  selectedElement.textContent = 'Click an item in the preview to select it.'
  selectedTextSelector = null
  selectedTextStyles = {}
  updateThemeInputs()
  updateTextStyleInputs()
  applyDraftToFrame()
  updateActions()
})

function setEditorUrl(page) {
  const url = new URL(window.location.href)
  url.searchParams.set('page', page)
  window.history.replaceState({}, '', url)
}

async function loadPageEdits(page) {
  const token = ++pageLoadToken
  activePage = page
  isLoadingPage = true
  updateActions()
  setStatus(`Loading ${pageSelect.selectedOptions[0]?.textContent || page}…`, 'saving')

  edits = emptyEdits()
  savedEdits = emptyEdits()
  undoStack = []
  endUndoGroup()
  currentSection = null
  selectedTextSelector = null
  selectedTextStyles = {}
  spacingControls.hidden = true
  spacingControls.replaceChildren()
  spacingHelp.textContent = 'Select Section spacing, then click a section in the preview to show its gap control.'
  selectedElement.textContent = 'Click an item in the preview to select it.'
  updateThemeInputs()
  updateTextStyleInputs()

  try {
    const response = await fetch(`/__visual-editor/edits?page=${encodeURIComponent(page)}`, { cache: 'no-store' })
    if (!response.ok) throw new Error('Saved edits could not be loaded.')
    const loaded = await response.json()
    if (token !== pageLoadToken) return
    edits = { ...emptyEdits(), ...loaded }
    savedEdits = cloneEdits(edits)
  } catch (error) {
    if (token !== pageLoadToken) return
    console.warn(`Saved edits for ${page} could not be loaded.`, error)
    setStatus('Could not load this page’s saved edits.', 'error')
  }

  if (token !== pageLoadToken) return
  updateThemeInputs()
  const previewUrl = `${page}?visual-edit=1`
  if (iframe.getAttribute('src') !== previewUrl) {
    iframe.src = previewUrl
  } else if (iframe.contentDocument?.readyState === 'complete') {
    tellFrame({ type: 'apply-edits', edits })
    tellFrame({ type: 'set-mode', mode: currentMode })
  }
  setEditorUrl(page)
  isLoadingPage = false
  updateActions()
}

pageSelect.addEventListener('change', () => {
  const nextPage = pageSelect.value
  if (isDirty() && !window.confirm('This page has unsaved changes. Switch pages and discard this draft?')) {
    pageSelect.value = activePage
    return
  }
  loadPageEdits(nextPage)
})

async function refreshPagePicker(selectedPath) {
  const response = await fetch('/__visual-editor/pages', { cache: 'no-store' })
  if (!response.ok) throw new Error('The page list could not be loaded.')
  const result = await response.json()
  const pages = result.pages ?? []
  pageSelect.replaceChildren(...pages.map(({ path, label }) => {
    const option = document.createElement('option')
    option.value = path
    option.textContent = label
    return option
  }))
  if (selectedPath && pages.some((entry) => entry.path === selectedPath)) pageSelect.value = selectedPath
  return pages
}

async function initializePagePicker() {
  try {
    const pages = await refreshPagePicker()
    const requestedPage = new URLSearchParams(window.location.search).get('page') || '/index.html'
    const page = pages.some((entry) => entry.path === requestedPage) ? requestedPage : '/index.html'
    pageSelect.value = page
    await loadPageEdits(page)
  } catch (error) {
    setStatus('Could not find site pages. Keep the dev server running and reload.', 'error')
    console.error('Visual editor page list failed:', error)
  }
}

initializePagePicker()
