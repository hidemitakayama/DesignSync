// scripts/ts-resolve.mjs を解決フックとして登録する（node --import ./scripts/register-ts.mjs で使う）。
import { register } from "node:module";
register("./ts-resolve.mjs", import.meta.url);
