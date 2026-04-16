<script setup>
import { reactive, watch, computed } from 'vue'
import { useAppStore } from '@/stores/useAppStore'
import { useGeoJsonGenerator } from '@/composables/useGeoJsonGenerator'
import { FARM_TYPE_PRESETS } from '@/constants/soilTypes'

const store = useAppStore()
const { generateFeatures } = useGeoJsonGenerator()

// ── Form State ────────────────────────────────────────────────────────────

const form = reactive({
  minLat: 35.0,
  maxLat: 55.0,
  minLng: -10.0,
  maxLng: 40.0,
  count: 20,
  minVertices: 4,
  maxVertices: 6,
  minAreaHa: 10,
  maxAreaHa: 100,
  bearingAngle: 30,
  bearingVariation: 25,
  farmType: 'Family',
})

const errors = reactive({})

// ── Farm Type Pre-fill ────────────────────────────────────────────────────

watch(
  () => form.farmType,
  (type) => {
    const preset = FARM_TYPE_PRESETS[type]
    if (preset) {
      form.minAreaHa = preset.minArea
      form.maxAreaHa = preset.maxArea
    }
  }
)

// ── Bbox Preview ─────────────────────────────────────────────────────────
// Push a live preview to the store whenever the 4 coords are valid.
// MapView watches this and redraws the dashed rectangle.

watch(
  () => [form.minLat, form.maxLat, form.minLng, form.maxLng],
  ([minLat, maxLat, minLng, maxLng]) => {
    const valid =
      !isNaN(minLat) && !isNaN(maxLat) && !isNaN(minLng) && !isNaN(maxLng) &&
      minLat >= -90 && maxLat <= 90 && minLat < maxLat &&
      minLng >= -180 && maxLng <= 180 && minLng < maxLng
    store.setBboxPreview(valid ? { minLat, maxLat, minLng, maxLng } : null)
  },
  { immediate: true }
)

// ── Validation ────────────────────────────────────────────────────────────

function clearErrors() {
  for (const k of Object.keys(errors)) delete errors[k]
}

function validate() {
  clearErrors()
  const e = {}

  if (isNaN(form.minLat) || isNaN(form.maxLat))     e.lat  = 'Enter valid latitude values'
  else if (form.minLat < -90 || form.maxLat > 90)   e.lat  = 'Latitude must be between −90 and 90'
  else if (form.minLat >= form.maxLat)               e.lat  = 'Min lat must be less than max lat'

  if (isNaN(form.minLng) || isNaN(form.maxLng))     e.lng  = 'Enter valid longitude values'
  else if (form.minLng < -180 || form.maxLng > 180) e.lng  = 'Longitude must be between −180 and 180'
  else if (form.minLng >= form.maxLng)               e.lng  = 'Min lng must be less than max lng'

  if (!Number.isInteger(form.count) || form.count < 1) e.count = 'Count must be at least 1'
  else if (form.count > 500)                            e.count = 'Maximum 500 polygons'

  if (form.minVertices < 3)                         e.verts = 'Min vertices must be ≥ 3'
  else if (form.maxVertices > 10)                   e.verts = 'Max vertices must be ≤ 10'
  else if (form.minVertices > form.maxVertices)     e.verts = 'Min vertices must be ≤ max'

  if (form.minAreaHa <= 0)                          e.area  = 'Min area must be greater than 0'
  else if (form.minAreaHa >= form.maxAreaHa)        e.area  = 'Min area must be less than max area'

  Object.assign(errors, e)
  return Object.keys(e).length === 0
}

// ── Actions ───────────────────────────────────────────────────────────────

const canGenerate = computed(() => !store.isGenerating && !store.isLoadingLand)

async function handleGenerate() {
  if (!validate()) return
  store.setError(null)
  try {
    await generateFeatures({
      bbox: [form.minLng, form.minLat, form.maxLng, form.maxLat],
      count: form.count,
      minVertices: form.minVertices,
      maxVertices: form.maxVertices,
      minAreaHa: form.minAreaHa,
      maxAreaHa: form.maxAreaHa,
      bearingAngle: form.bearingAngle,
      bearingVariation: form.bearingVariation,
    })
  } catch (err) {
    store.setError(err.message ?? 'Generation failed. Please try again.')
  }
}

function downloadGeoJSON() {
  const json = JSON.stringify(store.featureCollection, null, 2)
  const blob = new Blob([json], { type: 'application/geo+json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `farmland-${Date.now()}.geojson`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
</script>

<template>
  <aside class="panel">

    <!-- Header -->
    <div class="panel-header">
      <div class="flex items-center gap-2.5">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="flex-shrink-0" style="color:#C8A951">
          <path d="M12 2v20M8 6c0 0 1.5 3 4 3s4-3 4-3M8 10c0 0 1.5 3 4 3s4-3 4-3M8 14c0 0 1.5 3 4 3s4-3 4-3"
            stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <div>
          <h1 class="panel-title">Farmland Generator</h1>
          <p class="panel-subtitle">GeoJSON polygon builder</p>
        </div>
      </div>
    </div>

    <!-- Form body -->
    <div class="panel-body">

      <!-- Farm Type -->
      <section class="form-section">
        <p class="section-label">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor" class="inline-block mr-1 opacity-60">
            <rect x="1" y="5" width="10" height="6" rx="1"/><rect x="4" y="2" width="4" height="4" rx="0.5"/>
          </svg>
          Farm Type
        </p>
        <select v-model="form.farmType" class="field-input">
          <option v-for="(_, k) in FARM_TYPE_PRESETS" :key="k" :value="k">{{ k }}</option>
        </select>
        <p class="hint">Pre-fills the area range. Adjust below if needed.</p>
      </section>

      <hr class="divider">

      <!-- Bounding Box -->
      <section class="form-section">
        <p class="section-label">Bounding Box</p>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="field-label">Min Lat</label>
            <input v-model.number="form.minLat" type="number" step="0.5" min="-90" max="90" class="field-input">
          </div>
          <div>
            <label class="field-label">Max Lat</label>
            <input v-model.number="form.maxLat" type="number" step="0.5" min="-90" max="90" class="field-input">
          </div>
          <div>
            <label class="field-label">Min Lng</label>
            <input v-model.number="form.minLng" type="number" step="0.5" min="-180" max="180" class="field-input">
          </div>
          <div>
            <label class="field-label">Max Lng</label>
            <input v-model.number="form.maxLng" type="number" step="0.5" min="-180" max="180" class="field-input">
          </div>
        </div>
        <p v-if="errors.lat" class="field-error">⚠ {{ errors.lat }}</p>
        <p v-if="errors.lng" class="field-error">⚠ {{ errors.lng }}</p>
      </section>

      <hr class="divider">

      <!-- Polygon Count -->
      <section class="form-section">
        <p class="section-label">Polygon Count</p>
        <input v-model.number="form.count" type="number" min="1" max="500" class="field-input" placeholder="1 – 500">
        <p v-if="errors.count" class="field-error">⚠ {{ errors.count }}</p>
      </section>

      <hr class="divider">

      <!-- Vertex Count -->
      <section class="form-section">
        <p class="section-label">Vertices per Polygon</p>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="field-label">Min (≥ 3)</label>
            <input v-model.number="form.minVertices" type="number" min="3" max="10" class="field-input">
          </div>
          <div>
            <label class="field-label">Max (≤ 10)</label>
            <input v-model.number="form.maxVertices" type="number" min="3" max="10" class="field-input">
          </div>
        </div>
        <p v-if="errors.verts" class="field-error">⚠ {{ errors.verts }}</p>
      </section>

      <hr class="divider">

      <!-- Area -->
      <section class="form-section">
        <p class="section-label">Area per Polygon (hectares)</p>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="field-label">Min ha</label>
            <input v-model.number="form.minAreaHa" type="number" min="0.1" step="0.5" class="field-input">
          </div>
          <div>
            <label class="field-label">Max ha</label>
            <input v-model.number="form.maxAreaHa" type="number" min="0.1" step="0.5" class="field-input">
          </div>
        </div>
        <p v-if="errors.area" class="field-error">⚠ {{ errors.area }}</p>
      </section>

      <hr class="divider">

      <!-- Orientation / Bearing -->
      <section class="form-section">
        <p class="section-label">Field Orientation</p>
        <div class="space-y-3">
          <div>
            <div class="flex justify-between items-center mb-1">
              <label class="field-label" style="margin-bottom:0">Dominant Bearing</label>
              <span class="text-xs text-charcoal font-semibold" style="font-family:'JetBrains Mono',monospace">{{ form.bearingAngle }}°</span>
            </div>
            <input v-model.number="form.bearingAngle" type="range" min="0" max="360" class="range-input">
            <div class="flex justify-between mt-0.5" style="font-size:10px;color:#B8B2AB">
              <span>N 0°</span><span>E 90°</span><span>S 180°</span><span>W 270°</span><span>360°</span>
            </div>
          </div>
          <div>
            <div class="flex justify-between items-center mb-1">
              <label class="field-label" style="margin-bottom:0">Variation Range</label>
              <span class="text-xs text-charcoal font-semibold" style="font-family:'JetBrains Mono',monospace">±{{ form.bearingVariation }}°</span>
            </div>
            <input v-model.number="form.bearingVariation" type="range" min="0" max="90" class="range-input">
          </div>
        </div>
      </section>

      <!-- Global API error -->
      <div v-if="store.error" class="error-banner">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" class="flex-shrink-0 mt-0.5">
          <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3.5a.75.75 0 01.75.75v3a.75.75 0 01-1.5 0v-3A.75.75 0 018 4.5zm0 7a.875.875 0 110-1.75.875.875 0 010 1.75z"/>
        </svg>
        <span>{{ store.error }}</span>
      </div>

    </div>

    <!-- Footer actions -->
    <div class="panel-footer">
      <button
        @click="handleGenerate"
        :disabled="!canGenerate"
        class="btn-primary"
      >
        <span v-if="store.isGenerating" class="flex items-center justify-center gap-2">
          <svg class="animate-spin" style="width:13px;height:13px" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          Generating…
        </span>
        <span v-else>Generate Fields</span>
      </button>

      <Transition name="fade-btn">
        <button
          v-if="store.hasFeatures"
          @click="downloadGeoJSON"
          class="btn-outline"
        >
          ↓ Download GeoJSON
        </button>
      </Transition>
    </div>

  </aside>
</template>

<style scoped>
/* Layout */
.panel {
  display: flex;
  flex-direction: column;
  width: 380px;
  flex-shrink: 0;
  height: 100%;
  background: #fff;
  border-right: 1px solid #E8E2D9;
  box-shadow: 2px 0 14px rgba(74,55,40,0.07);
  overflow: hidden;
}

.panel-header {
  padding: 18px 22px 16px;
  border-bottom: 1px solid #E8E2D9;
  flex-shrink: 0;
  border-left: 3px solid #C8A951;
}

.panel-title {
  font-size: 15px;
  font-weight: 700;
  color: #2C2C2C;
  letter-spacing: -0.01em;
  line-height: 1.2;
  font-family: 'Inter', sans-serif;
}

.panel-subtitle {
  font-size: 11px;
  color: #6B6B6B;
  margin-top: 2px;
  font-family: 'Inter', sans-serif;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.panel-footer {
  flex-shrink: 0;
  padding: 14px 20px 18px;
  border-top: 1px solid #E8E2D9;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Form elements */
.form-section {
  padding: 14px 0;
}

.section-label {
  font-size: 10.5px;
  font-weight: 700;
  color: #6B6B6B;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 10px;
  font-family: 'Inter', sans-serif;
}

.field-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #6B6B6B;
  margin-bottom: 4px;
  font-family: 'Inter', sans-serif;
}

.field-input {
  width: 100%;
  border: 1px solid #E8E2D9;
  border-radius: 8px;
  padding: 7px 11px;
  font-size: 13px;
  color: #2C2C2C;
  background: #FDFAF5;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
  font-family: 'Inter', sans-serif;
  -webkit-appearance: none;
}
.field-input:focus {
  border-color: #C8A951;
  box-shadow: 0 0 0 3px rgba(200,169,81,0.18);
  background: #fff;
}
.field-input::placeholder {
  color: #C8C2BA;
}

.range-input {
  width: 100%;
  height: 5px;
  border-radius: 99px;
  appearance: none;
  -webkit-appearance: none;
  background: #E8E2D9;
  outline: none;
  cursor: pointer;
  accent-color: #7D9B76;
}

.divider {
  border: none;
  border-top: 1px solid #F0EBE3;
  margin: 0;
}

.hint {
  font-size: 11px;
  color: #9E9890;
  margin-top: 5px;
  font-family: 'Inter', sans-serif;
}

.field-error {
  font-size: 11.5px;
  color: #C0614A;
  margin-top: 5px;
  font-family: 'Inter', sans-serif;
}

.error-banner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12.5px;
  color: #C0614A;
  background: rgba(192,97,74,0.07);
  border: 1px solid rgba(192,97,74,0.2);
  border-radius: 8px;
  padding: 10px 12px;
  margin-top: 4px;
  font-family: 'Inter', sans-serif;
}

/* Buttons */
.btn-primary {
  width: 100%;
  padding: 10px 16px;
  border-radius: 9px;
  font-size: 12.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  background: #4A3728;
  color: #F9F6F0;
  border: none;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s, opacity 0.15s;
  font-family: 'Inter', sans-serif;
}
.btn-primary:hover:not(:disabled) {
  background: #3a2a1e;
}
.btn-primary:active:not(:disabled) {
  transform: scale(0.98);
}
.btn-primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn-outline {
  width: 100%;
  padding: 9px 16px;
  border-radius: 9px;
  font-size: 12.5px;
  font-weight: 600;
  border: 2px solid #7D9B76;
  color: #7D9B76;
  background: transparent;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  font-family: 'Inter', sans-serif;
}
.btn-outline:hover {
  background: rgba(125,155,118,0.08);
}
.btn-outline:active {
  transform: scale(0.98);
}

/* Transitions */
.fade-btn-enter-active,
.fade-btn-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-btn-enter-from,
.fade-btn-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
