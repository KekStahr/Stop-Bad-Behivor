const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("resoDesktop", {
  invoke: (path, { method = "GET", body } = {}) => ipcRenderer.invoke("api", { method, path, body }),
  onEvent: (callback) => {
    const listener = (_event, message) => callback(message);
    ipcRenderer.on("reso-event", listener);
    return () => ipcRenderer.removeListener("reso-event", listener);
  },
});
