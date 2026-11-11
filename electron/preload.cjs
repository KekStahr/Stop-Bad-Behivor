const { contextBridge } = require("electron");

function argumentValue(prefix) {
  const argument = process.argv.find((value) => value.startsWith(prefix));
  return argument ? argument.slice(prefix.length) : "";
}

contextBridge.exposeInMainWorld("resoDesktop", {
  apiUrl: argumentValue("--reso-api-url="),
  apiToken: argumentValue("--reso-api-token="),
});
