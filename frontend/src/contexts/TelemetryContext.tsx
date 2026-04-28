import { createContext, useContext } from 'react'
import { useSignalR } from '../hooks/useSignalR'
import type { TelemetryMessage } from '../types/TelemetryMessage'

interface TelemetryContextValue {
  messages: TelemetryMessage[]
  connected: boolean
}

const TelemetryContext = createContext<TelemetryContextValue>({ messages: [], connected: false })

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const { messages, connected } = useSignalR()
  return (
    <TelemetryContext.Provider value={{ messages, connected }}>
      {children}
    </TelemetryContext.Provider>
  )
}

export function useTelemetry() {
  return useContext(TelemetryContext)
}
