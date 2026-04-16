import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAppStore = defineStore('app', () => {
  // State
  const landGeoJson     = ref(null)
  const mapInstance     = ref(null)
  const features        = ref([])
  const isGenerating    = ref(false)
  const isLoadingLand   = ref(false)
  const error           = ref(null)
  // null when invalid, or { minLat, maxLat, minLng, maxLng }
  const bboxPreview     = ref({ minLat: 35, maxLat: 55, minLng: -10, maxLng: 40 })
  const generationStats = ref({
    attempted: 0,
    succeeded: 0,
    failed: 0,
    totalAreaHa: 0,
  })

  // Getters
  const hasFeatures = computed(() => features.value.length > 0)
  const featureCollection = computed(() => ({
    type: 'FeatureCollection',
    features: features.value,
  }))

  // Actions
  function setMapInstance(map) { mapInstance.value = map }
  function setLandGeoJson(gj)  { landGeoJson.value = gj  }
  function setFeatures(f)      { features.value = f      }
  function setGenerating(v)    { isGenerating.value = v  }
  function setLoadingLand(v)   { isLoadingLand.value = v }
  function setError(e)         { error.value = e         }
  function setStats(s)         { generationStats.value = { ...generationStats.value, ...s } }
  function setBboxPreview(v)   { bboxPreview.value = v }
  function clearFeatures() {
    features.value = []
    generationStats.value = { attempted: 0, succeeded: 0, failed: 0, totalAreaHa: 0 }
  }

  return {
    landGeoJson,
    mapInstance,
    features,
    isGenerating,
    isLoadingLand,
    error,
    bboxPreview,
    generationStats,
    hasFeatures,
    featureCollection,
    setMapInstance,
    setLandGeoJson,
    setFeatures,
    setGenerating,
    setLoadingLand,
    setError,
    setStats,
    setBboxPreview,
    clearFeatures,
  }
})
