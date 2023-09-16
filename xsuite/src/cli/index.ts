import { command } from "./command";

if (process.env["PWD"]) {
  process.chdir(process.env["PWD"]);
}

command.parseAsync();
