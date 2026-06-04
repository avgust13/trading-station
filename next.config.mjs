/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable SWC's styled-components transform (SSR class names, displayName).
  compiler: {
    styledComponents: true,
  },
  // Self-contained server output for a tiny Docker image.
  output: "standalone",
  // yahoo-finance2 is a Node-only package; don't try to bundle it into the
  // route handler — require it at runtime instead.
  serverExternalPackages: ["yahoo-finance2"],
};

export default nextConfig;
