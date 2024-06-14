import { getCommand } from "./cli";

if (process.env["PWD"]) {
  process.chdir(process.env["PWD"]);
}

getCommand().parseAsync();
