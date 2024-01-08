import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  sendMessage: (message: string) => ipcRenderer.send('message', message),
  getBrcPage: (params: { table: string, page: number, itemsPerPage: number }) => {
    // This is a stub for the actual implementation
    ipcRenderer.send('getBrcPage', params)
  },
  on: (channel: string, callback: (event: any, ...data: any) => void) => ipcRenderer.on(channel, callback)
})
