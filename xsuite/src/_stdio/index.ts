import readline from "node:readline";
import { Writable } from "node:stream";

export const input = {
  injected: [] as string[],
  async hidden(query: string): Promise<string> {
    const shifted = this.injected.shift();
    if (shifted !== undefined) {
      process.stdout.write(query + "\n");
      return Promise.resolve(shifted);
    }

    const muted = { v: false };

    const mutableStdout = new Writable({
      write(chunk, encoding, callback) {
        if (!muted.v) {
          process.stdout.write(chunk, encoding);
        }
        callback();
      },
    });

    const rl = readline.createInterface({
      input: process.stdin,
      output: mutableStdout,
      terminal: true,
    });

    return new Promise<string>((resolve) => {
      rl.question(query, function (password) {
        rl.close();
        process.stdout.write("\n");
        resolve(password);
      });
      muted.v = true;
    });
  },
};

export function log(...msgs: string[]) {
  process.stdout.write(msgs.join(" ") + "\n");
}

const createStdInterceptor = (std: "stdout" | "stderr") => {
  const f = process[std].write;
  let _data = "";
  return {
    start() {
      _data = "";
      process[std].write = (chunk) => {
        _data += chunk;
        return true;
      };
    },
    stop() {
      process[std].write = f;
    },
    get data() {
      return _data;
    },
  };
};

export const stdoutInt = createStdInterceptor("stdout");

export const stderrInt = createStdInterceptor("stderr");
