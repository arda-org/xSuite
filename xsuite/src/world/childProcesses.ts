import { ChildProcess, spawn } from "child_process";

export const childProcesses: Set<ChildProcess> = new Set();

export const spawnChildProcess: typeof spawn = (...args: any) => {
  const childProcess = (spawn as any)(...args);
  childProcesses.add(childProcess);
  return childProcess;
};

export const killChildProcess = (childProcess: ChildProcess) => {
  childProcess.kill();
  childProcesses.delete(childProcess);
};

process.on("SIGTERM", () => {
  for (const childProcess of childProcesses) {
    killChildProcess(childProcess);
  }
});
