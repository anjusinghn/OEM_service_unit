"use client"
import { useEffect, useRef } from "react"
import { useDashboardStore } from "../stores/dashboard-store"
import { API_BASE_URL } from "../lib/api-client"

export function useSSE() {
  const setSnapshot = useDashboardStore((s) => s.setSnapshot)
  const setSseConnected = useDashboardStore((s) => s.setSseConnected)
  const retryRef = useRef(0)

  useEffect(() => {
    let sse: EventSource | null = null
    let timer: ReturnType<typeof setTimeout> | null = null

    function connect() {
      sse = new EventSource(`${API_BASE_URL}/api/v1/events`)

      sse.onopen = () => {
        setSseConnected(true)
        retryRef.current = 0
      }

      sse.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          setSnapshot(data)
        } catch {}
      }

      sse.onerror = () => {
        setSseConnected(false)
        sse?.close()
        const delay = Math.min(1000 * 2 ** retryRef.current, 30000)
        retryRef.current++
        timer = setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      sse?.close()
      if (timer) clearTimeout(timer)
    }
  }, [setSnapshot, setSseConnected])
}
