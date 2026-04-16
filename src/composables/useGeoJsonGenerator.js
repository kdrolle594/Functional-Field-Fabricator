import {
  point,
  polygon,
  rewind,
  area,
  length,
  bbox,
  kinks,
  destination,
  booleanPointInPolygon,
  booleanIntersects,
  booleanContains,
  polygonToLine,
} from '@turf/turf'
import axios from 'axios'
import { useAppStore } from '@/stores/useAppStore'
import { CROP_TYPE_IDS } from '@/constants/cropTypes'
import { SOIL_TYPES } from '@/constants/soilTypes'

const LAND_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_land.geojson'

// ── Spatial Grid Index ──────────────────────────────────────────────────────

function createSpatialIndex(bboxCoords, cellSizeDeg) {
  const [minLng, minLat, maxLng, maxLat] = bboxCoords
  const cols = Math.max(1, Math.ceil((maxLng - minLng) / cellSizeDeg))
  const rows = Math.max(1, Math.ceil((maxLat - minLat) / cellSizeDeg))
  const grid = new Map()

  function cellKey(c, r) {
    return `${c},${r}`
  }

  function bboxToCells(featureBbox) {
    const [fMinLng, fMinLat, fMaxLng, fMaxLat] = featureBbox
    const c0 = Math.max(0, Math.floor((fMinLng - minLng) / cellSizeDeg))
    const c1 = Math.min(cols - 1, Math.floor((fMaxLng - minLng) / cellSizeDeg))
    const r0 = Math.max(0, Math.floor((fMinLat - minLat) / cellSizeDeg))
    const r1 = Math.min(rows - 1, Math.floor((fMaxLat - minLat) / cellSizeDeg))
    const cells = []
    for (let c = c0; c <= c1; c++)
      for (let r = r0; r <= r1; r++)
        cells.push(cellKey(c, r))
    return cells
  }

  function insert(featureIdx, featureBbox) {
    for (const key of bboxToCells(featureBbox)) {
      if (!grid.has(key)) grid.set(key, new Set())
      grid.get(key).add(featureIdx)
    }
  }

  function query(featureBbox) {
    const candidates = new Set()
    for (const key of bboxToCells(featureBbox))
      if (grid.has(key))
        for (const idx of grid.get(key))
          candidates.add(idx)
    return [...candidates]
  }

  return { insert, query }
}

// ── Polygon Shape Generator ─────────────────────────────────────────────────

function generatePolygonShape(seedPoint, targetAreaHa, bearingDeg, vertexCount) {
  const areaM2 = targetAreaHa * 10000
  const r = Math.sqrt(areaM2 / Math.PI)

  // Aspect ratio 1.5–3.0, elongated fields
  const aspectRatio = 1.5 + Math.random() * 1.5
  const shortAxisM  = r / Math.sqrt(aspectRatio)
  const longAxisM   = r * Math.sqrt(aspectRatio)

  // Evenly space N angles around the ellipse
  const baseAngles = Array.from({ length: vertexCount }, (_, i) => (i / vertexCount) * 360)

  // Apply ±10° jitter per vertex
  const jitteredAngles = baseAngles.map(a => a + (Math.random() - 0.5) * 20)

  const bearingRad = (bearingDeg * Math.PI) / 180

  const coords = jitteredAngles.map(angleDeg => {
    const angleRad = (angleDeg * Math.PI) / 180

    // Ellipse in local space: long axis along bearing
    const lx = Math.cos(angleRad) * longAxisM
    const ly = Math.sin(angleRad) * shortAxisM

    // Rotate by bearing (bearing 0 = north = +y in geo)
    const northM  =  lx * Math.cos(bearingRad) - ly * Math.sin(bearingRad)
    const eastM   =  lx * Math.sin(bearingRad) + ly * Math.cos(bearingRad)

    const distKm    = Math.sqrt(northM ** 2 + eastM ** 2) / 1000
    // atan2(east, north) gives bearing from north in radians
    const vertexBearing = (Math.atan2(eastM, northM) * 180) / Math.PI

    const dest = destination(seedPoint, distKm, vertexBearing, { units: 'kilometers' })
    return dest.geometry.coordinates
  })

  // Close ring
  coords.push([...coords[0]])

  // Round to 6 decimal places
  const rounded = coords.map(([lng, lat]) => [
    Math.round(lng * 1e6) / 1e6,
    Math.round(lat * 1e6) / 1e6,
  ])

  const poly = polygon([rounded])
  // RFC 7946: exterior ring must be counter-clockwise
  return rewind(poly, { reverse: false, mutate: true })
}

// ── Land Check ──────────────────────────────────────────────────────────────

function isPointOnLand(pt, landGeoJson) {
  for (const feature of landGeoJson.features) {
    if (booleanPointInPolygon(pt, feature)) return true
  }
  return false
}

// ── Self-intersection Check ─────────────────────────────────────────────────

function hasSelfIntersection(poly) {
  try {
    const kinksResult = kinks(poly)
    return kinksResult.features.length > 0
  } catch {
    return true
  }
}

// ── Overlap / Containment Check ─────────────────────────────────────────────

function hasOverlapOrContainment(newPoly, existingFeatures, spatialIndex) {
  const featureBbox = bbox(newPoly)
  const candidateIdxs = spatialIndex.query(featureBbox)
  for (const idx of candidateIdxs) {
    const existing = existingFeatures[idx]
    try {
      if (booleanIntersects(newPoly, existing))      return true
      if (booleanContains(newPoly, existing))        return true
      if (booleanContains(existing, newPoly))        return true
    } catch {
      return true
    }
  }
  return false
}

// ── Random Properties ────────────────────────────────────────────────────────

function randomProperties(poly, idx) {
  const areaM2   = area(poly)
  const areaHa   = Math.round((areaM2 / 10000) * 100) / 100
  const line     = polygonToLine(poly)
  const perimM   = Math.round(length(line, { units: 'meters' }) * 10) / 10

  const now        = Date.now()
  const threeYears = 3 * 365 * 24 * 60 * 60 * 1000
  const surveyTs   = now - Math.random() * threeYears
  const lastSurvey = new Date(surveyTs).toISOString().split('T')[0]

  const cropType  = CROP_TYPE_IDS[Math.floor(Math.random() * CROP_TYPE_IDS.length)]
  const soilType  = SOIL_TYPES[Math.floor(Math.random() * SOIL_TYPES.length)]
  const farmerId  = `F${String(Math.floor(Math.random() * 9000) + 1000)}`
  const fieldId   = `FLD-${now}-${String(idx).padStart(4, '0')}`

  return {
    field_id:    fieldId,
    area_ha:     areaHa,
    perimeter_m: perimM,
    crop_type:   cropType,
    soil_type:   soilType,
    irrigation:  Math.random() > 0.4,
    last_survey: lastSurvey,
    farmer_id:   farmerId,
  }
}

// ── Main Composable ──────────────────────────────────────────────────────────

export function useGeoJsonGenerator() {
  const store = useAppStore()

  async function fetchLandData() {
    if (store.landGeoJson) return store.landGeoJson
    store.setLoadingLand(true)
    store.setError(null)
    try {
      const { data } = await axios.get(LAND_URL)
      store.setLandGeoJson(data)
      return data
    } catch (err) {
      const msg = 'Failed to load land data. Check your connection and try again.'
      store.setError(msg)
      throw new Error(msg)
    } finally {
      store.setLoadingLand(false)
    }
  }

  async function generateFeatures(params) {
    const {
      bbox: bboxCoords,
      count,
      minVertices,
      maxVertices,
      minAreaHa,
      maxAreaHa,
      bearingAngle,
      bearingVariation,
    } = params

    const landData = await fetchLandData()

    store.setGenerating(true)
    store.clearFeatures()

    const [minLng, minLat, maxLng, maxLat] = bboxCoords

    // Check if bbox is entirely over water (sample 20 random points)
    let landHits = 0
    for (let i = 0; i < 20; i++) {
      const sampleLng = minLng + Math.random() * (maxLng - minLng)
      const sampleLat = minLat + Math.random() * (maxLat - minLat)
      if (isPointOnLand(point([sampleLng, sampleLat]), landData)) landHits++
    }
    if (landHits === 0) {
      store.setGenerating(false)
      store.setError('Warning: The selected bounding box appears to be entirely over water. No land polygons can be placed.')
      return { type: 'FeatureCollection', features: [] }
    }

    // Spatial index cell size based on max polygon footprint
    const maxAreaM2    = maxAreaHa * 10000
    const approxMaxDeg = Math.sqrt(maxAreaM2) / 111320
    const cellSize     = Math.max(approxMaxDeg * 2, 0.01)
    const spatialIndex = createSpatialIndex(bboxCoords, cellSize)

    const collected    = []
    const maxAttempts  = count * 10
    let   attempted    = 0

    while (collected.length < count && attempted < maxAttempts) {
      attempted++

      // Yield to event loop every 10 attempts so Vue can render progress
      if (attempted % 10 === 0) {
        store.setStats({
          attempted,
          succeeded: collected.length,
          failed: attempted - collected.length,
          totalAreaHa: Math.round(
            collected.reduce((s, f) => s + (f.properties.area_ha || 0), 0) * 100
          ) / 100,
        })
        await new Promise(resolve => setTimeout(resolve, 0))
      }

      // 1. Random seed point within bbox
      const lng  = minLng + Math.random() * (maxLng - minLng)
      const lat  = minLat + Math.random() * (maxLat - minLat)
      const seed = point([lng, lat])

      // 2. Land check
      if (!isPointOnLand(seed, landData)) continue

      // 3. Generate polygon shape
      const vertexCount = minVertices + Math.floor(Math.random() * (maxVertices - minVertices + 1))
      const targetArea  = minAreaHa + Math.random() * (maxAreaHa - minAreaHa)
      const bearing     = bearingAngle + (Math.random() - 0.5) * 2 * bearingVariation

      let poly
      try {
        poly = generatePolygonShape(seed, targetArea, bearing, vertexCount)
      } catch {
        continue
      }

      // 3b. All vertices must be on land
      const ring = poly.geometry.coordinates[0]
      const allOnLand = ring.every(([vLng, vLat]) =>
        isPointOnLand(point([vLng, vLat]), landData)
      )
      if (!allOnLand) continue

      // 4. Bounds check — polygon must fit within bbox
      const [pMinLng, pMinLat, pMaxLng, pMaxLat] = bbox(poly)
      if (pMinLng < minLng || pMaxLng > maxLng || pMinLat < minLat || pMaxLat > maxLat) continue

      // 5. Self-intersection check
      if (hasSelfIntersection(poly)) continue

      // 6. Overlap / containment check
      if (hasOverlapOrContainment(poly, collected, spatialIndex)) continue

      // 7. Assign properties
      const props   = randomProperties(poly, collected.length)
      const feature = { ...poly, properties: props }

      // 8. Insert into spatial index
      spatialIndex.insert(collected.length, bbox(poly))
      collected.push(feature)
    }

    const totalAreaHa = Math.round(
      collected.reduce((s, f) => s + (f.properties.area_ha || 0), 0) * 100
    ) / 100

    const finalStats = {
      attempted,
      succeeded: collected.length,
      failed: attempted - collected.length,
      totalAreaHa,
    }

    store.setFeatures(collected)
    store.setStats(finalStats)
    store.setGenerating(false)

    return { type: 'FeatureCollection', features: collected }
  }

  return { generateFeatures }
}
