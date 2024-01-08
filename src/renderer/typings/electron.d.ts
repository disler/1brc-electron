/**
 * Should match main/preload.ts for typescript support in renderer
 */
export default interface ElectronApi {
  sendMessage: (message: string) => void,
  getBrcPage: (params: { table: string, page: number, itemsPerPage: number }) => void,
  on: (channel: string, callback: (data: any) => void) => void,
}

declare global {
  interface Window {
    electronAPI: ElectronApi,
  }
}
