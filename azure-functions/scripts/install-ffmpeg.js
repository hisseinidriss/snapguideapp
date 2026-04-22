const fs = require("fs/promises");
const fsSync = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const VENDOR_ROOT = path.join(ROOT_DIR, "vendor", "ffmpeg");
const TMP_ROOT = path.join(os.tmpdir(), "snapguide-ffmpeg-install");

const TARGETS = {
  "linux-x64": {
    dir: "linux-x64",
    archiveType: "tar.xz",
    downloads: [
      {
        url: "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz",
        ffmpegName: "ffmpeg",
        ffprobeName: "ffprobe",
      },
    ],
  },
  "linux-arm64": {
    dir: "linux-arm64",
    archiveType: "tar.xz",
    downloads: [
      {
        url: "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linuxarm64-gpl.tar.xz",
        ffmpegName: "ffmpeg",
        ffprobeName: "ffprobe",
      },
    ],
  },
  "darwin-x64": {
    dir: "darwin-x64",
    archiveType: "zip",
    downloads: [
      {
        url: "https://evermeet.cx/ffmpeg/getrelease/zip",
        ffmpegName: "ffmpeg",
      },
      {
        url: "https://evermeet.cx/ffmpeg/getrelease/ffprobe/zip",
        ffprobeName: "ffprobe",
      },
    ],
  },
  "darwin-arm64": {
    dir: "darwin-arm64",
    archiveType: "zip",
    downloads: [
      {
        url: "https://evermeet.cx/ffmpeg/getrelease/zip",
        ffmpegName: "ffmpeg",
      },
      {
        url: "https://evermeet.cx/ffmpeg/getrelease/ffprobe/zip",
        ffprobeName: "ffprobe",
      },
    ],
  },
  "win32-x64": {
    dir: "win32-x64",
    archiveType: "zip",
    downloads: [
      {
        url: "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip",
        ffmpegName: "ffmpeg.exe",
        ffprobeName: "ffprobe.exe",
      },
    ],
  },
};

function getTargetKey() {
  return `${process.platform}-${process.arch}`;
}

function getTarget() {
  const key = getTargetKey();
  const target = TARGETS[key];
  if (!target) {
    throw new Error(
      `Unsupported platform for ffmpeg bundle install: ${key}. ` +
        `Supported targets: ${Object.keys(TARGETS).join(", ")}`
    );
  }
  return { key, ...target };
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function removeIfExists(filePath) {
  await fs.rm(filePath, { recursive: true, force: true }).catch(() => {});
}

async function downloadFile(url, destinationPath) {
  const response = await fetch(url, {
    headers: { "User-Agent": "snapguide-ffmpeg-installer" },
  });
  if (!response.ok) {
    throw new Error(`Failed to download ${url} (${response.status})`);
  }
  const arrayBuffer = await response.arrayBuffer();
  await fs.writeFile(destinationPath, Buffer.from(arrayBuffer));
}

function extractArchive(archivePath, destinationPath, archiveType) {
  if (archiveType === "tar.xz") {
    execFileSync("tar", ["-xJf", archivePath, "-C", destinationPath], {
      stdio: "inherit",
    });
    return;
  }

  if (archiveType === "zip") {
    if (process.platform === "win32") {
      execFileSync(
        "powershell.exe",
        [
          "-NoProfile",
          "-Command",
          `Expand-Archive -LiteralPath '${archivePath.replace(/'/g, "''")}' -DestinationPath '${destinationPath.replace(/'/g, "''")}' -Force`,
        ],
        { stdio: "inherit" }
      );
      return;
    }

    execFileSync("unzip", ["-oq", archivePath, "-d", destinationPath], {
      stdio: "inherit",
    });
    return;
  }

  throw new Error(`Unsupported archive type: ${archiveType}`);
}

async function walk(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) return walk(fullPath);
      return [fullPath];
    })
  );
  return files.flat();
}

async function findBinary(extractedDir, binaryName) {
  const files = await walk(extractedDir);
  const match = files.find((filePath) => path.basename(filePath) === binaryName);
  if (!match) {
    throw new Error(`Could not find ${binaryName} in extracted archive ${extractedDir}`);
  }
  return match;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath, fsSync.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function runVersion(binaryPath) {
  execFileSync(binaryPath, ["-version"], { stdio: "ignore" });
}

async function install() {
  const target = getTarget();
  const installDir = path.join(VENDOR_ROOT, target.dir);
  const ffmpegPath = path.join(installDir, target.key.startsWith("win32-") ? "ffmpeg.exe" : "ffmpeg");
  const ffprobePath = path.join(installDir, target.key.startsWith("win32-") ? "ffprobe.exe" : "ffprobe");

  if ((await fileExists(ffmpegPath)) && (await fileExists(ffprobePath))) {
    try {
      runVersion(ffmpegPath);
      runVersion(ffprobePath);
      console.log(`Using existing ffmpeg bundle at ${installDir}`);
      return;
    } catch {
      await removeIfExists(installDir);
    }
  }

  const tempDir = path.join(TMP_ROOT, `${target.dir}-${Date.now()}`);
  await removeIfExists(tempDir);
  await ensureDir(tempDir);
  await ensureDir(installDir);

  try {
    let locatedFfmpeg = null;
    let locatedFfprobe = null;

    for (let index = 0; index < target.downloads.length; index += 1) {
      const download = target.downloads[index];
      const archivePath = path.join(tempDir, `archive-${index}.${target.archiveType.replace(".", "-")}`);
      const extractDir = path.join(tempDir, `extract-${index}`);
      await ensureDir(extractDir);
      console.log(`Downloading ${download.url}`);
      await downloadFile(download.url, archivePath);
      console.log(`Extracting ${path.basename(archivePath)}`);
      extractArchive(archivePath, extractDir, target.archiveType);

      if (download.ffmpegName && !locatedFfmpeg) {
        locatedFfmpeg = await findBinary(extractDir, download.ffmpegName);
      }
      if (download.ffprobeName && !locatedFfprobe) {
        locatedFfprobe = await findBinary(extractDir, download.ffprobeName);
      }
    }

    if (!locatedFfmpeg || !locatedFfprobe) {
      throw new Error(`Failed to install ffmpeg bundle for ${target.key}`);
    }

    await fs.copyFile(locatedFfmpeg, ffmpegPath);
    await fs.copyFile(locatedFfprobe, ffprobePath);

    if (process.platform !== "win32") {
      await fs.chmod(ffmpegPath, 0o755);
      await fs.chmod(ffprobePath, 0o755);
    }

    runVersion(ffmpegPath);
    runVersion(ffprobePath);

    await fs.writeFile(
      path.join(installDir, "metadata.json"),
      JSON.stringify(
        {
          installedAt: new Date().toISOString(),
          platform: process.platform,
          arch: process.arch,
          sources: target.downloads.map((item) => item.url),
        },
        null,
        2
      )
    );

    console.log(`Installed ffmpeg bundle to ${installDir}`);
  } finally {
    await removeIfExists(tempDir);
  }
}

install().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
