import { promises as fs } from "fs";
import path from "path";

export type AppVersionConfig = {
  latestVersion: string;
  minimumVersion: string;
  forceUpdate: boolean;
  title: string;
  message: string;
  androidUrl: string;
  iosUrl: string;
  updatedAt: string;
};

const DATA_PATH = path.join(process.cwd(), "data", "app-version.json");

const defaults: AppVersionConfig = {
  latestVersion: "1.2.0",
  minimumVersion: "1.2.0",
  forceUpdate: true,
  title: "Update required",
  message: "A new Code's Thinker LMS version is available. Please update to continue.",
  androidUrl: "https://play.google.com/store/apps",
  iosUrl: "https://apps.apple.com",
  updatedAt: new Date().toISOString(),
};

export async function readAppVersion(): Promise<AppVersionConfig> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    return { ...defaults, ...(JSON.parse(raw) as AppVersionConfig) };
  } catch {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, JSON.stringify(defaults, null, 2), "utf8");
    return defaults;
  }
}

export async function writeAppVersion(config: AppVersionConfig) {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(config, null, 2), "utf8");
}
