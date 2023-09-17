import { getCommand } from "./command";

if (process.env["PWD"]) {
  process.chdir(process.env["PWD"]);
}

getCommand().parseAsync();
