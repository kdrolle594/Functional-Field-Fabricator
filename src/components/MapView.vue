<script setup>
import { ref, onMounted, onUnmounted, watch, markRaw } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useAppStore } from '@/stores/useAppStore'
import { useMapDisplay } from '@/composables/useMapDisplay'
import StatusBar from './StatusBar.vue'
import Legend from './Legend.vue'

const store = useAppStore()
const { initLayerGroup, redrawFeatures } = useMapDisplay()
const mapContainer = ref(null)
let map = null
let bboxRect = null  // single L.rectangle reused for the preview

onMounted(() => {
  map = L.map(mapContainer.value, {
    zoomControl: true,
    attributionControl: true,
  }).setView([20, 10], 3)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map)

  initLayerGroup(L, map)
  store.setMapInstance(markRaw(map))

  // Draw initial bbox preview if one is already in the store
  if (store.bboxPreview) drawBboxRect(store.bboxPreview)
})

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
  store.setMapInstance(null)
})

// ── Bbox preview rectangle ───────────────────────────────────────────────

function drawBboxRect(bbox) {
  const bounds = [[bbox.minLat, bbox.minLng], [bbox.maxLat, bbox.maxLng]]
  if (bboxRect) {
    bboxRect.setBounds(bounds)
  } else {
    bboxRect = L.rectangle(bounds, {
      color: '#C8A951',       // wheat gold
      weight: 2,
      dashArray: '6 5',
      fillColor: '#C8A951',
      fillOpacity: 0.06,
      interactive: false,
    }).addTo(map)
  }
}

function removeBboxRect() {
  if (bboxRect) {
    bboxRect.remove()
    bboxRect = null
  }
}

watch(
  () => store.bboxPreview,
  (bbox) => {
    if (!map) return
    if (bbox) {
      drawBboxRect(bbox)
    } else {
      removeBboxRect()
    }
  }
)

// Shallow watch — store replaces the features array wholesale
watch(
  () => store.features,
  (features) => {
    if (!map) return
    redrawFeatures(L, features)

    if (features.length > 0) {
      // Compute bounds from all feature bboxes for fitBounds
      let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity
      for (const f of features) {
        const coords = f.geometry.coordinates[0]
        for (const [lng, lat] of coords) {
          if (lng < minLng) minLng = lng
          if (lat < minLat) minLat = lat
          if (lng > maxLng) maxLng = lng
          if (lat > maxLat) maxLat = lat
        }
      }
      map.fitBounds(
        [[minLat, minLng], [maxLat, maxLng]],
        { padding: [40, 40], animate: true }
      )
    }
  },
  { deep: false }
)
</script>

<template>
  <div class="relative w-full h-full">
    <!-- Leaflet map -->
    <div ref="mapContainer" class="w-full h-full" />

    <!-- Loading overlay -->
    <Transition name="fade">
      <div
        v-if="store.isGenerating || store.isLoadingLand"
        class="absolute inset-0 z-[2000] flex flex-col items-center justify-center gap-3"
        style="background: rgba(249,246,240,0.65); backdrop-filter: blur(2px)"
      >
        <!-- Wheat-gold ring spinner -->
        <svg
          class="animate-spin"
          style="width:44px;height:44px;color:#C8A951"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12" cy="12" r="10"
            stroke="currentColor"
            stroke-width="3"
          />
          <path
            class="opacity-80"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <span
          style="font-family:'Inter',sans-serif;font-size:14px;font-weight:500;color:#2C2C2C"
        >
          {{ store.isLoadingLand ? 'Loading land data…' : 'Generating fields…' }}
        </span>
        <span
          v-if="store.isGenerating && store.generationStats.attempted > 0"
          style="font-family:'Inter',sans-serif;font-size:12px;color:#6B6B6B"
        >
          {{ store.generationStats.succeeded }} / {{ store.generationStats.attempted }} placed
        </span>
      </div>
    </Transition>

    <!-- Floating overlays -->
    <StatusBar />
    <Legend />
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
