export const CROP_TYPES = [
  { id: 'Maize',    label: 'Maize',    color: '#E8A020' },
  { id: 'Wheat',    label: 'Wheat',    color: '#C8A951' },
  { id: 'Soybean',  label: 'Soybean',  color: '#9DC183' },
  { id: 'Rice',     label: 'Rice',     color: '#8FBC8F' },
  { id: 'Cotton',   label: 'Cotton',   color: '#D4C5B0' },
  { id: 'Fallow',   label: 'Fallow',   color: '#B8A898' },
  { id: 'Pasture',  label: 'Pasture',  color: '#7D9B76' },
]

export const CROP_TYPE_IDS = CROP_TYPES.map(c => c.id)

export const CROP_COLOR_MAP = Object.fromEntries(
  CROP_TYPES.map(c => [c.id, c.color])
)
