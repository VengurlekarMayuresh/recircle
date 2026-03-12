"use client"

import { useEffect, useRef } from "react"

interface Hub {
  id: number
  name: string
  type: string
  address: string
  locationLat: number
  locationLng: number
  categories: string
  website?: string
  hours?: string
}

interface Props {
  hubs: Hub[]
  selected: Hub | null
  onSelect: (hub: Hub) => void
}

export default function RepairMap({ hubs, selected, onSelect }: Props) {
  const mapRef      = useRef<any>(null)
  const markersRef  = useRef<any[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return

    const init = async () => {
      const L = (await import("leaflet")).default
      await import("leaflet/dist/leaflet.css")

      // Fix default icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      })

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current!, {
          center: [20.5937, 78.9629], // India center
          zoom: 5,
        })
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(mapRef.current)
      }

      // Clear old markers
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []

      hubs.forEach(hub => {
        const marker = L.marker([hub.locationLat, hub.locationLng])
          .addTo(mapRef.current)
          .bindPopup(`
            <strong>${hub.name}</strong><br/>
            <span style="font-size:12px;color:#555">${hub.type} · ${hub.address}</span><br/>
            <span style="font-size:11px;color:#059669">${hub.categories}</span>
          `)
          .on("click", () => onSelect(hub))
        markersRef.current.push(marker)
      })
    }

    init()
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [hubs]) // eslint-disable-line

  // Pan to selected
  useEffect(() => {
    if (selected && mapRef.current) {
      mapRef.current.flyTo([selected.locationLat, selected.locationLng], 13)
    }
  }, [selected])

  return <div ref={containerRef} className="w-full h-full" />
}
