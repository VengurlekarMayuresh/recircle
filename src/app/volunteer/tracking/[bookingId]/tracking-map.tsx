"use client"

import { useEffect } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// Fix default marker icons in Next.js
const pickupIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const deliveryIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const volunteerIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length >= 2) {
      const bounds = L.latLngBounds(points.map((p) => L.latLng(p[0], p[1])))
      map.fitBounds(bounds, { padding: [50, 50] })
    } else if (points.length === 1) {
      map.setView(points[0], 13)
    }
  }, [map, points])
  return null
}

interface TrackingMapProps {
  pickupLat: number
  pickupLng: number
  deliveryLat: number
  deliveryLng: number
  volunteerLat: number | null
  volunteerLng: number | null
}

export default function TrackingMap({
  pickupLat, pickupLng, deliveryLat, deliveryLng, volunteerLat, volunteerLng,
}: TrackingMapProps) {
  const points: [number, number][] = []
  if (pickupLat && pickupLng) points.push([pickupLat, pickupLng])
  if (deliveryLat && deliveryLng) points.push([deliveryLat, deliveryLng])
  if (volunteerLat && volunteerLng) points.push([volunteerLat, volunteerLng])

  const center: [number, number] = points.length > 0 ? points[0] : [19.076, 72.8777] // Mumbai default

  return (
    <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {pickupLat && pickupLng && (
        <Marker position={[pickupLat, pickupLng]} icon={pickupIcon}>
          <Popup>
            <strong>📦 Pickup Location</strong>
          </Popup>
        </Marker>
      )}

      {deliveryLat && deliveryLng && (
        <Marker position={[deliveryLat, deliveryLng]} icon={deliveryIcon}>
          <Popup>
            <strong>🏠 Delivery Location</strong>
          </Popup>
        </Marker>
      )}

      {volunteerLat && volunteerLng && (
        <Marker position={[volunteerLat, volunteerLng]} icon={volunteerIcon}>
          <Popup>
            <strong>🚴 Volunteer Location</strong>
          </Popup>
        </Marker>
      )}

      <FitBounds points={points} />
    </MapContainer>
  )
}
