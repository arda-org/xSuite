import { CLI } from "./cli";

if (process.env["PWD"]) {
  process.chdir(process.env["PWD"]);
}

new CLI().parseAsync();
