// 拡張子なしの相対import（例：import ... from "./types"）を .ts に解決するフック。
// Node の TypeScript 実行（型注釈の除去）は拡張子を補完しないため、lib/ のモジュールを
// スクリプトから直接読み込むにはこの解決フックが要る。
export async function resolve(specifier, context, next) {
  if (specifier.startsWith(".") && !/\.[cm]?[jt]sx?$/.test(specifier)) {
    try {
      return await next(`${specifier}.ts`, context);
    } catch {
      /* .ts が無ければ元の指定でやり直す */
    }
  }
  return next(specifier, context);
}
