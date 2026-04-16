import { CROP_COLOR_MAP } from '@/constants/cropTypes'

let layerGroup = null

function buildPopupHTML(props) {
  const color = CROP_COLOR_MAP[props.crop_type] ?? '#888'
  return `
    <div style="font-family:'Inter',sans-serif;font-size:13px;min-width:210px">
      <div style="margin-bottom:8px">
        <span style="
          display:inline-block;padding:2px 10px;border-radius:999px;font-size:11px;
          font-weight:600;background:${color}22;color:${color};
          border:1.5px solid ${color}
        ">${props.crop_type}</span>
      </div>
      <table style="width:100%;border-collapse:collapse">
        ${row('Field ID',    `<span style="font-family:'JetBrains Mono',monospace;font-size:10px">${props.field_id}</span>`)}
        ${row('Area',        `${props.area_ha} ha`)}
        ${row('Perimeter',   `${props.perimeter_m} m`)}
        ${row('Soil',        props.soil_type)}
        ${row('Irrigation',  props.irrigation ? '✓ Yes' : '✗ No')}
        ${row('Last Survey', props.last_survey)}
        ${row('Farmer ID',   `<span style="font-family:'JetBrains Mono',monospace">${props.farmer_id}</span>`)}
      </table>
    </div>
  `
}

function row(label, value) {
  return `
    <tr>
      <td style="color:#6B6B6B;padding:2px 8px 2px 0;white-space:nowrap;vertical-align:top">${label}</td>
      <td style="color:#2C2C2C;padding:2px 0;font-weight:500">${value}</td>
    </tr>
  `
}

export function useMapDisplay() {
  function initLayerGroup(L, map) {
    if (layerGroup) {
      layerGroup.clearLayers()
      layerGroup.remove()
    }
    layerGroup = L.layerGroup().addTo(map)
  }

  function redrawFeatures(L, features) {
    if (!layerGroup) return
    layerGroup.clearLayers()

    for (const feature of features) {
      const color = CROP_COLOR_MAP[feature.properties.crop_type] ?? '#888888'

      const layer = L.geoJSON(feature, {
        style: {
          color,
          weight: 2,
          opacity: 0.9,
          fillColor: color,
          fillOpacity: 0.28,
        },
      })

      layer.bindPopup(buildPopupHTML(feature.properties), {
        maxWidth: 280,
        className: 'farm-popup',
      })

      layerGroup.addLayer(layer)
    }
  }

  return { initLayerGroup, redrawFeatures }
}
