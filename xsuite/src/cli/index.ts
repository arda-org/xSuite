import { getCli } from "./cli";

if (process.env["PWD"]) {
  process.chdir(process.env["PWD"]);
}

getCli().parseAsync();
