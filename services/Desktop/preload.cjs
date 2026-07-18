const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("neuralensDesktop", {
  isDesktop: true,
  platform: process.platform,
  setScreenShareState(active, analyzing = false) {
    ipcRenderer.send("screen-share-state", { active: Boolean(active), analyzing: Boolean(analyzing) });
  },
  configureDeepgram(apiKey) {
    return ipcRenderer.invoke("configure-deepgram", apiKey);
  },
});
