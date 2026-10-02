// Renders bumper.html to an MP4, frame by frame (deterministic, no dropped frames).
// Usage: node render.mjs [--cut 30|15] [--fps 30] [--out file.mp4] [--stills 2,7,12]
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
// Resolve playwright from the project or from global installs (NODE_PATH).
const { chromium } = createRequire(import.meta.url)("playwright");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d; };
const fps = Number(arg("--fps", 30));

const stills = arg("--stills", null);
const cut = arg("--cut", "30");
const out = arg("--out", join(here, cut === "30" ? "talk-forum-bumper.mp4" : `talk-forum-bumper-${cut}s.mp4`));

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(pathToFileURL(join(here, "bumper.html")).href + `?capture&cut=${cut}`);
await page.evaluate(() => document.fonts.ready);
const duration = await page.evaluate(() => window.DURATION);
const stage = await page.$("#stage");

if (stills) {
  for (const s of stills.split(",").map(Number)) {
    await page.evaluate((t) => window.render(t), s);
    await stage.screenshot({ path: join(here, `still-${cut}-${String(s).replace(".", "_")}s.png`) });
  }
  await browser.close();
  process.exit(0);
}

const dir = mkdtempSync(join(tmpdir(), "bumper-"));
const total = Math.round(duration * fps);
for (let f = 0; f < total; f++) {
  await page.evaluate((t) => window.render(t), f / fps);
  await stage.screenshot({ path: join(dir, `f${String(f).padStart(5, "0")}.png`) });
  if (f % fps === 0) process.stdout.write(`\r${f / fps}s / ${duration}s`);
}
await browser.close();

await new Promise((res, rej) => {
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(fps), "-i", join(dir, "f%05d.png"),
    "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out], { stdio: "inherit" });
  ff.on("exit", (c) => (c === 0 ? res() : rej(new Error("ffmpeg exited " + c))));
});
rmSync(dir, { recursive: true, force: true });
console.log(`\nWrote ${out}`);
