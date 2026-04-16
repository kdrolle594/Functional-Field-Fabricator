# Functionaal Field Fabricator

A Vue 3 + Vite application that generates realistic mock farmland GeoJSON polygons constrained to land areas, with a Leaflet map display and full property metadata on each field.

---

## Setup

```sh
npm install
npm run dev
```

The dev server starts at `http://localhost:5173`.

```sh
npm run build    # production build → dist/
npm run preview  # preview production build
```

---

## Tech Stack

| Layer | Library |
|-------|---------|
| UI framework | Vue 3 (Composition API, `<script setup>`) |
| Build tool | Vite 8 |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Map | Leaflet 1.9 |
| Geometry | @turf/turf 7 |
| State | Pinia |
| HTTP | Axios |

---

## Project Structure

```
src/
├── App.vue                          Root layout (two-panel)
├── main.js                          App entry, Pinia registration
├── assets/
│   └── tailwind.css                 Tailwind @import + @theme tokens
├── components/
│   ├── InputPanel.vue               All user controls (left panel)
│   ├── MapView.vue                  Leaflet map + loading overlay
│   ├── StatusBar.vue                Floating generation stats pill
│   └── Legend.vue                   Floating crop-type legend card
├── composables/
│   ├── useGeoJsonGenerator.js       Core polygon generation algorithm
│   └── useMapDisplay.js             Leaflet layer management
├── constants/
│   ├── cropTypes.js                 Crop types with display colors
│   └── soilTypes.js                 Soil types + farm preset ranges
└── stores/
    └── useAppStore.js               Pinia store (shared state)
```

---

## Generation Algorithm

### Overview

Each generation run attempts to place `N` farmland polygons within a user-defined bounding box, constrained entirely to land. The algorithm is rejection-based with a spatial index for efficient overlap detection.

### Step-by-step

**1. Land data fetch**
On first run, the app fetches Natural Earth 110m land polygons from the GitHub raw URL and caches them in the Pinia store. All subsequent generations reuse the cached data.

**2. Seed point selection**
A random longitude/latitude is sampled uniformly within the bounding box. The point is tested against all ~130 Natural Earth land features using `turf.booleanPointInPolygon`. Seeds that fall in water are immediately discarded.

**3. Polygon shape generation**
Given a seed point, target area in hectares, bearing angle, and vertex count:

- A base radius `r = sqrt(areaM2 / π)` is computed from the target area
- An aspect ratio between 1.5:1 and 3:1 is chosen randomly (elongated field shape)
- The short axis = `r / sqrt(aspectRatio)`, long axis = `r × sqrt(aspectRatio)`
- `N` angles are evenly spaced around 360°, then each is jittered by ±10°
- Each angle maps to a point on the ellipse in local space (long axis along the dominant bearing)
- The local vector is rotated to world orientation using the bearing angle
- `turf.destination` converts each (seed, distanceKm, bearing) into a [lng, lat] coordinate
- All coordinates are rounded to 6 decimal places
- The ring is closed (first vertex repeated), then `turf.rewind` enforces RFC 7946 CCW winding

**4. Validation**

Each candidate polygon is checked for:
- **Self-intersection** — `turf.kinks` must return an empty feature collection
- **Bounding box containment** — all vertices must lie within the user bbox
- **Overlap / containment** — checked against previously accepted polygons using a spatial grid index

If any check fails, the attempt is counted as failed and a new seed is tried. After 100× the requested count attempts, generation stops.

**5. Spatial grid index**

To avoid O(n²) overlap checking, the bounding box is divided into a grid of cells sized approximately twice the maximum polygon footprint. Each accepted polygon is registered into the cells it overlaps. When checking a new candidate, only polygons in overlapping cells are tested with `turf.booleanIntersects` / `turf.booleanContains`.

**6. Property assignment**

Each accepted polygon receives:
- `field_id` — unique string based on timestamp + index
- `area_ha` — computed from actual geometry via `turf.area`, rounded to 2 dp
- `perimeter_m` — computed via `turf.length(turf.polygonToLine(...))`, rounded to 1 dp
- `crop_type` — random from: Maize, Wheat, Soybean, Rice, Cotton, Fallow, Pasture
- `soil_type` — random from 6 soil classes
- `irrigation` — random boolean
- `last_survey` — random ISO date within the last 3 years
- `farmer_id` — random alphanumeric mock ID

**7. Async yielding**

Every 10 attempts the loop yields control back to the event loop (`await new Promise(r => setTimeout(r, 0))`), allowing Vue to flush reactive updates and render progress in the loading overlay.

---

## UI Controls

| Control | Description |
|---------|-------------|
| Farm Type | Pre-fills min/max area for Smallholder (0.5–5 ha), Family (10–100 ha), or Industrial (100–500 ha) |
| Bounding Box | Min/max lat/lng defining the generation area |
| Polygon Count | How many fields to generate (1–500) |
| Vertices per Polygon | Shape complexity per field (3–10) |
| Area (ha) | Min/max hectares per polygon |
| Dominant Bearing | Primary orientation angle for all fields in the batch |
| Variation Range | ±degrees of random deviation from the dominant bearing per polygon |

---

## Output

Click **Download GeoJSON** to export the generated `FeatureCollection` as a `.geojson` file, usable in QGIS, Mapbox, geojson.io, or any GIS tool.
