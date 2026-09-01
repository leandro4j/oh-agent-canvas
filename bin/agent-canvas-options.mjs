export function parseAgentCanvasMode(args) {
  const sandbox = args.includes("--sandbox");

  return {
    frontendOnly: sandbox || args.includes("--frontend-only"),
    backendOnly: args.includes("--backend-only"),
  };
}
