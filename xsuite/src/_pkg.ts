import fs from "node:fs";
import path from "node:path";

export const pkgPath = path.resolve(__dirname, "..");

const { version: pkgVersion } = JSON.parse(
  fs.readFileSync(path.resolve(pkgPath, "package.json"), "utf-8"),
);

export { pkgVersion };
