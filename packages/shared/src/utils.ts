export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export const round = (value: number, digits = 1) => {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export const average = (values: number[]) => {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export const distanceKm = (
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
) => {
  const earthRadius = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2)
  const y = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
  return round(earthRadius * y, 1)
}

export const createId = (prefix: string, index: number) => `${prefix}-${String(index).padStart(3, "0")}`

export const nowIso = () => new Date().toISOString()

export const addHours = (dateIso: string, hours: number) => new Date(new Date(dateIso).getTime() + hours * 60 * 60 * 1000).toISOString()

export const toTitleCase = (value: string) =>
  value
    .replace(/[-_]/g, " ")
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
