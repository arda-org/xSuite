import { AsyncLocalStorage } from "node:async_hooks";
import readline from "node:readline";
import { Writable } from "node:stream";

export const cwd = () => {
  const ctx = contextStorage.getStore();
  return ctx ? ctx.cwd() : defaultCwd();
};

const defaultCwd = () => process.cwd();

export const readHidden = (s: string) => {
  const ctx = contextStorage.getStore();
  return ctx ? ctx.readHidden(s) : defaultReadHidden(s);
};

const defaultReadHidden = (p: string) => {
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
    rl.question(p, function (password) {
      rl.close();
      process.stdout.write("\n");
      resolve(password);
    });
    muted.v = true;
  });
};

export const log = (s: string = "") => {
  const ctx = contextStorage.getStore();
  return ctx ? ctx.log(s) : defaultLog(s);
};

const defaultLog = (s: string) => {
  process.stdout.write(s + "\n");
};

export class Context {
  private stdout: string = "";
  private inputs: string[] = [];
  private _cwd: string;

  constructor({ cwd }: { cwd?: string } = {}) {
    this._cwd = cwd ?? process.cwd();
  }

  cwd() {
    return this._cwd;
  }

  setCwd(cwd: string) {
    this._cwd = cwd;
  }

  log(s: string) {
    this.stdout += s + "\n";
  }

  readHidden(s: string) {
    const input = this.inputs.shift();
    if (input === undefined) {
      throw new Error("Undefined input.");
    }
    this.log(s);
    return Promise.resolve(input);
  }

  input(...inputs: string[]) {
    this.inputs.push(...inputs);
  }

  flushStdout() {
    const stdout = this.stdout;
    this.stdout = "";
    return stdout;
  }

  run<T>(callback: () => T) {
    return contextStorage.run(this, callback);
  }
}

const contextStorage = new AsyncLocalStorage<Context>();
