import type { Photo } from '@repo/shared'

/** The carer's window drives the senior's window (second screen or projector) in the same browser. */
const CHANNEL = 'pamiec-na-zywo-ekran'

export type ScreenMessage = { type: 'show'; photo: Photo | null } | { type: 'hello' }

export function openScreenChannel(onMessage: (message: ScreenMessage) => void) {
  const channel = new BroadcastChannel(CHANNEL)
  channel.onmessage = (event: MessageEvent<ScreenMessage>) => onMessage(event.data)
  return {
    send: (message: ScreenMessage) => channel.postMessage(message),
    close: () => channel.close(),
  }
}
