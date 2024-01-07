import {contextBridge, ipcRenderer} from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  sendMessage: (message: string) => ipcRenderer.send('message', message),
  getBrcPage: (params: { table: string, page: number, itemsPerPage: number }) => {
    // This is a stub for the actual implementation
    console.log('getBrcPage called with params:', params);
  },
  on: (channel: string, callback: (data: any) => void) => {
    // This is a stub for the actual implementation
    ipcRenderer.on(channel, (event, ...args) => callback(...args));
  }
  sendMessage: (message: string) => ipcRenderer.send('message', message)
})
