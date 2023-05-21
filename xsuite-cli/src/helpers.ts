import fs from "node:fs";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import stream from "node:stream";
import util from "node:util";
import tar from "tar";

export const downloadAndExtractContract = async (
  cwd: string,
  contract: string
) => {
  const file = await downloadTar(
    "https://codeload.github.com/arda-org/xSuite.js/tar.gz/main"
  );
  await tar.x({
    file,
    cwd,
    strip: 2 + contract.split("/").length,
    filter: (p) => p.includes(`xSuite.js-main/contracts/${contract}/`),
  });
  fs.unlinkSync(file);
};

const pipeline = util.promisify(stream.Stream.pipeline);

const downloadTar = (url: string) => {
  const file = path.join(os.tmpdir(), `xSuite.js-contract-${Date.now()}`);
  return new Promise<string>((resolve, reject) => {
    https
      .get(url, (response) => {
        pipeline(response, fs.createWriteStream(file))
          .then(() => resolve(file))
          .catch(reject);
      })
      .on("error", reject);
  });
};
