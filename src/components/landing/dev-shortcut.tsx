"use client"

import { useEffect } from "react"

export function DevShortcut() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === "q") {
        e.preventDefault()
        window.location.href = "/app?action=dev-login"
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  return null
}