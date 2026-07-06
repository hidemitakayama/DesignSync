import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // このプロジェクトは親ディレクトリ（別のlockfileあり）の中に置かれているため、
  // Turbopackのワークスペースルートを自分自身に固定して誤検出を防ぐ。
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
