const childProcess = require("node:child_process");

const originalSpawn = childProcess.spawn;

function mapLinuxScreenCapture(args) {
  const mapped = [...args];
  const formatIndex = mapped.indexOf("gdigrab");
  if (formatIndex >= 0) {
    mapped[formatIndex] = "x11grab";
  }

  const drawMouseIndex = mapped.indexOf("-draw_mouse");
  if (drawMouseIndex >= 0) {
    mapped.splice(drawMouseIndex, 2);
  }

  const inputIndex = mapped.indexOf("-i");
  if (inputIndex >= 0 && mapped[inputIndex + 1] === "desktop") {
    mapped[inputIndex + 1] = process.env.DISPLAY || ":99.0";
  }

  return mapped;
}

childProcess.spawn = function spawn(command, args, options) {
  if (process.platform !== "win32" && command === "ffmpeg" && args.includes("gdigrab")) {
    return originalSpawn.call(this, command, mapLinuxScreenCapture(args), options);
  }

  return originalSpawn.call(this, command, args, options);
};
