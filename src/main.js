import './style.css'

const STORAGE_KEY = 'timezone-bridge-state'
const DEFAULT_SOURCE = 'America/Los_Angeles'
const DEFAULT_TARGET = 'Europe/Berlin'

const timeZones = typeof Intl.supportedValuesOf === 'function'
  ? Intl.supportedValuesOf('timeZone')
  : [DEFAULT_SOURCE, DEFAULT_TARGET, 'UTC']

const formatterCache = new Map()

const defaultDate = new Date()
defaultDate.setSeconds(0, 0)

const state = loadState()

const app = document.querySelector('#app')

app.innerHTML = `
  <main class="app-shell">
    <section class="hero-panel">
      <p class="eyebrow">Timezone bridge</p>
      <h1>Move time between places without doing the math.</h1>
      <p class="hero-copy">Pick a source and target timezone, edit either side, and keep your most-used zones one tap away.</p>
    </section>

    <section class="toolbar" aria-label="Actions">
      <button class="action-button" id="swap-zones" type="button">Swap zones</button>
      <button class="action-button" id="jump-now" type="button">Use now</button>
    </section>

    <section class="converter-grid">
      <article class="time-card" data-side="source">
        <div class="card-header">
          <div>
            <p class="card-label">Source</p>
            <h2>Convert from</h2>
          </div>
          <button class="favorite-toggle" id="favorite-source" type="button" aria-pressed="false">☆</button>
        </div>
        <label class="field-label" for="source-zone">Timezone</label>
        <select id="source-zone" class="select-field"></select>
        <p class="field-label">Date and time</p>
        <div class="date-time-row">
          <input id="source-date" class="time-input" type="date" />
          <input id="source-time" class="time-input" type="time" step="60" />
        </div>
        <p class="meta-line" id="source-meta"></p>
      </article>

      <article class="time-card" data-side="target">
        <div class="card-header">
          <div>
            <p class="card-label">Target</p>
            <h2>Convert to</h2>
          </div>
          <button class="favorite-toggle" id="favorite-target" type="button" aria-pressed="false">☆</button>
        </div>
        <label class="field-label" for="target-zone">Timezone</label>
        <select id="target-zone" class="select-field"></select>
        <p class="field-label">Date and time</p>
        <div class="date-time-row">
          <input id="target-date" class="time-input" type="date" />
          <input id="target-time" class="time-input" type="time" step="60" />
        </div>
        <p class="meta-line" id="target-meta"></p>
      </article>
    </section>

    <section class="favorites-panel">
      <div class="favorites-header">
        <div>
          <p class="card-label">Favorites</p>
          <h2>Saved timezones</h2>
        </div>
        <p class="favorites-hint" id="favorites-hint"></p>
      </div>
      <div class="favorites-list" id="favorites-list"></div>
    </section>

    <footer class="site-footer">
      <a class="footer-link" href="https://github.com/badokun/time" target="_blank" rel="noreferrer">View source on GitHub</a>
    </footer>
  </main>
`

const sourceZoneSelect = document.querySelector('#source-zone')
const targetZoneSelect = document.querySelector('#target-zone')
const sourceDateInput = document.querySelector('#source-date')
const sourceTimeInput = document.querySelector('#source-time')
const targetDateInput = document.querySelector('#target-date')
const targetTimeInput = document.querySelector('#target-time')
const sourceMeta = document.querySelector('#source-meta')
const targetMeta = document.querySelector('#target-meta')
const favoriteSourceButton = document.querySelector('#favorite-source')
const favoriteTargetButton = document.querySelector('#favorite-target')
const favoritesList = document.querySelector('#favorites-list')
const favoritesHint = document.querySelector('#favorites-hint')
const swapButton = document.querySelector('#swap-zones')
const jumpNowButton = document.querySelector('#jump-now')

renderZoneOptions(sourceZoneSelect, state.sourceTimeZone)
renderZoneOptions(targetZoneSelect, state.targetTimeZone)
syncInputsFromInstant()
renderFavorites()
renderFavoriteButtons()

sourceZoneSelect.addEventListener('change', (event) => {
  state.sourceTimeZone = event.target.value
  state.activeSide = 'source'
  syncInputsFromInstant()
  renderZoneOptions(sourceZoneSelect, state.sourceTimeZone)
  renderFavoriteButtons()
  renderFavorites()
  persistState()
})

targetZoneSelect.addEventListener('change', (event) => {
  state.targetTimeZone = event.target.value
  state.activeSide = 'target'
  syncInputsFromInstant()
  renderZoneOptions(targetZoneSelect, state.targetTimeZone)
  renderFavoriteButtons()
  renderFavorites()
  persistState()
})

sourceDateInput.addEventListener('input', () => {
  updateFromSideInputs('source')
})

sourceTimeInput.addEventListener('input', () => {
  updateFromSideInputs('source')
})

targetDateInput.addEventListener('input', () => {
  updateFromSideInputs('target')
})

targetTimeInput.addEventListener('input', () => {
  updateFromSideInputs('target')
})

sourceDateInput.addEventListener('focus', () => {
  state.activeSide = 'source'
  renderFavorites()
  persistState()
})

sourceTimeInput.addEventListener('focus', () => {
  state.activeSide = 'source'
  renderFavorites()
  persistState()
})

targetDateInput.addEventListener('focus', () => {
  state.activeSide = 'target'
  renderFavorites()
  persistState()
})

targetTimeInput.addEventListener('focus', () => {
  state.activeSide = 'target'
  renderFavorites()
  persistState()
})

favoriteSourceButton.addEventListener('click', () => {
  toggleFavorite(state.sourceTimeZone)
})

favoriteTargetButton.addEventListener('click', () => {
  toggleFavorite(state.targetTimeZone)
})

swapButton.addEventListener('click', () => {
  const previousSource = state.sourceTimeZone
  state.sourceTimeZone = state.targetTimeZone
  state.targetTimeZone = previousSource
  state.activeSide = state.activeSide === 'source' ? 'target' : 'source'
  renderZoneOptions(sourceZoneSelect, state.sourceTimeZone)
  renderZoneOptions(targetZoneSelect, state.targetTimeZone)
  syncInputsFromInstant()
  renderFavoriteButtons()
  renderFavorites()
  persistState()
})

jumpNowButton.addEventListener('click', () => {
  const now = new Date()
  now.setSeconds(0, 0)
  state.instant = now.toISOString()
  syncInputsFromInstant()
  persistState()
})

function loadState() {
  const fallback = {
    sourceTimeZone: timeZones.includes(DEFAULT_SOURCE) ? DEFAULT_SOURCE : timeZones[0],
    targetTimeZone: timeZones.includes(DEFAULT_TARGET) ? DEFAULT_TARGET : timeZones[1] ?? timeZones[0],
    favorites: [DEFAULT_SOURCE, DEFAULT_TARGET].filter((zone, index, array) => timeZones.includes(zone) && array.indexOf(zone) === index),
    activeSide: 'source',
    instant: defaultDate.toISOString(),
  }

  const rawState = localStorage.getItem(STORAGE_KEY)

  if (!rawState) {
    return fallback
  }

  try {
    const parsedState = JSON.parse(rawState)
    const sourceTimeZone = timeZones.includes(parsedState.sourceTimeZone) ? parsedState.sourceTimeZone : fallback.sourceTimeZone
    const targetTimeZone = timeZones.includes(parsedState.targetTimeZone) ? parsedState.targetTimeZone : fallback.targetTimeZone
    const favorites = Array.isArray(parsedState.favorites)
      ? parsedState.favorites.filter((zone, index, array) => timeZones.includes(zone) && array.indexOf(zone) === index)
      : fallback.favorites
    const instant = Number.isNaN(new Date(parsedState.instant).getTime()) ? fallback.instant : parsedState.instant

    return {
      sourceTimeZone,
      targetTimeZone,
      favorites,
      activeSide: parsedState.activeSide === 'target' ? 'target' : 'source',
      instant,
    }
  } catch {
    return fallback
  }
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function renderZoneOptions(select, selectedValue) {
  select.innerHTML = buildZoneOptions(selectedValue)
  select.value = selectedValue
}

function buildZoneOptions(selectedValue) {
  const favoriteOptions = state.favorites
    .filter((zone) => timeZones.includes(zone))
    .map((zone) => buildOption(zone, selectedValue))
    .join('')

  const allOptions = timeZones
    .map((zone) => buildOption(zone, selectedValue))
    .join('')

  if (!favoriteOptions) {
    return allOptions
  }

  return `
    <optgroup label="Favorites">${favoriteOptions}</optgroup>
    <optgroup label="All timezones">${allOptions}</optgroup>
  `
}

function buildOption(zone, selectedValue) {
  const selected = zone === selectedValue ? ' selected' : ''
  return `<option value="${zone}"${selected}>${formatZoneLabel(zone)}</option>`
}

function updateFromSideInputs(side) {
  const dateValue = side === 'source' ? sourceDateInput.value : targetDateInput.value
  const timeValue = side === 'source' ? sourceTimeInput.value : targetTimeInput.value

  if (!dateValue || !timeValue) {
    return
  }

  const value = `${dateValue}T${timeValue}`
  const timeZone = side === 'source' ? state.sourceTimeZone : state.targetTimeZone
  const instant = zonedDateTimeToUtc(value, timeZone)

  if (!instant) {
    return
  }

  state.instant = instant.toISOString()
  state.activeSide = side
  syncInputsFromInstant()
  persistState()
}

function syncInputsFromInstant() {
  const instant = new Date(state.instant)
  const sourceValue = formatForInput(instant, state.sourceTimeZone)
  const targetValue = formatForInput(instant, state.targetTimeZone)

  sourceDateInput.value = sourceValue.date
  sourceTimeInput.value = sourceValue.time
  targetDateInput.value = targetValue.date
  targetTimeInput.value = targetValue.time
  sourceMeta.textContent = describeTimeZone(instant, state.sourceTimeZone)
  targetMeta.textContent = describeTimeZone(instant, state.targetTimeZone)
  favoritesHint.textContent = `Tap a favorite to apply it to the ${state.activeSide} timezone.`
}

function renderFavoriteButtons() {
  renderFavoriteButton(favoriteSourceButton, state.sourceTimeZone)
  renderFavoriteButton(favoriteTargetButton, state.targetTimeZone)
}

function renderFavoriteButton(button, zone) {
  const isFavorite = state.favorites.includes(zone)
  button.textContent = isFavorite ? '★' : '☆'
  button.setAttribute('aria-pressed', String(isFavorite))
  button.setAttribute('aria-label', isFavorite ? `Remove ${zone} from favorites` : `Add ${zone} to favorites`)
}

function renderFavorites() {
  if (!state.favorites.length) {
    favoritesList.innerHTML = '<p class="empty-state">No favorites yet. Use the star on either card to save a timezone.</p>'
    return
  }

  favoritesList.innerHTML = state.favorites
    .map((zone) => `
      <button class="favorite-chip${zone === currentActiveZone() ? ' is-active' : ''}" type="button" data-zone="${zone}">
        <span>${formatZoneLabel(zone)}</span>
      </button>
    `)
    .join('')

  favoritesList.querySelectorAll('.favorite-chip').forEach((button) => {
    button.addEventListener('click', () => {
      applyFavorite(button.dataset.zone)
    })
  })
}

function currentActiveZone() {
  return state.activeSide === 'source' ? state.sourceTimeZone : state.targetTimeZone
}

function applyFavorite(zone) {
  if (state.activeSide === 'source') {
    state.sourceTimeZone = zone
    renderZoneOptions(sourceZoneSelect, state.sourceTimeZone)
  } else {
    state.targetTimeZone = zone
    renderZoneOptions(targetZoneSelect, state.targetTimeZone)
  }

  syncInputsFromInstant()
  renderFavoriteButtons()
  renderFavorites()
  persistState()
}

function toggleFavorite(zone) {
  if (state.favorites.includes(zone)) {
    state.favorites = state.favorites.filter((favorite) => favorite !== zone)
  } else {
    state.favorites = [zone, ...state.favorites]
  }

  renderZoneOptions(sourceZoneSelect, state.sourceTimeZone)
  renderZoneOptions(targetZoneSelect, state.targetTimeZone)
  renderFavoriteButtons()
  renderFavorites()
  persistState()
}

function formatZoneLabel(zone) {
  return zone.replaceAll('_', ' / ')
}

function formatForInput(date, timeZone) {
  const parts = getZonedParts(date, timeZone)
  return {
    date: `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`,
    time: `${pad(parts.hour)}:${pad(parts.minute)}`,
  }
}

function describeTimeZone(date, timeZone) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date)
}

function zonedDateTimeToUtc(value, timeZone) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/)

  if (!match) {
    return null
  }

  const [, year, month, day, hour, minute] = match
  const utcGuess = new Date(Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    0,
  ))

  let offset = getTimeZoneOffsetMs(timeZone, utcGuess)
  let result = new Date(utcGuess.getTime() - offset)
  const refinedOffset = getTimeZoneOffsetMs(timeZone, result)

  if (refinedOffset !== offset) {
    offset = refinedOffset
    result = new Date(utcGuess.getTime() - offset)
  }

  return result
}

function getTimeZoneOffsetMs(timeZone, date) {
  const parts = getZonedParts(date, timeZone)
  const utcTime = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  )

  return utcTime - date.getTime()
}

function getZonedParts(date, timeZone) {
  const formatter = getFormatter(timeZone)
  const formattedParts = formatter.formatToParts(date)

  return formattedParts.reduce((parts, part) => {
    if (part.type !== 'literal') {
      parts[part.type] = Number(part.value)
    }

    return parts
  }, {})
}

function getFormatter(timeZone) {
  if (!formatterCache.has(timeZone)) {
    formatterCache.set(timeZone, new Intl.DateTimeFormat('en-CA', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }))
  }

  return formatterCache.get(timeZone)
}

function pad(value) {
  return String(value).padStart(2, '0')
}

persistState()
