import { getCommand } from "./cmd";

if (process.env["PWD"]) {
  process.chdir(process.env["PWD"]);
}

getCommand().parseAsync();
