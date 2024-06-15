import { AsyncLocalStorage } from "node:async_hooks";
import readline from "node:readline";
import { Writable } from "node:stream";

export const readHidden = (p: string) => {
  const f = contextStorage.getStore()?.readHidden ?? defaultReadHidden;
  return f(p);
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
  const f = contextStorage.getStore()?.log ?? defaultLog;
  return f(s);
};

const defaultLog = (s: string) => {
  process.stdout.write(s + "\n");
};

export class Context {
  stdout: string = "";
  inputs: string[] = [];

  run<T>(callback: () => T) {
    const log = (buffer: string) => {
      this.stdout += buffer + "\n";
    };
    const readHidden = (p: string) => {
      const input = this.inputs.shift();
      if (input === undefined) {
        throw new Error("Undefined input.");
      }
      log(p);
      return Promise.resolve(input);
    };
    return contextStorage.run({ log, readHidden }, callback);
  }

  input(...inputs: string[]) {
    this.inputs.push(...inputs);
  }

  flushStdout() {
    const stdout = this.stdout;
    this.stdout = "";
    return stdout;
  }
}

const contextStorage = new AsyncLocalStorage<{
  log: (buffer: string) => void;
  readHidden: (p: string) => Promise<string>;
}>();
