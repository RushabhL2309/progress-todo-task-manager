/** Client sends x-demo-mode: true|false. Default is demo ON until user turns it off in Settings. */
export function isDemoMode(request?: Request): boolean {
  if (request) {
    const header = request.headers.get("x-demo-mode");
    if (header === "true") return true;
    if (header === "false") return false;
  }

  if (process.env.USE_DEMO_DATA === "false") return false;
  if (process.env.USE_DEMO_DATA === "true") return true;

  return true;
}
