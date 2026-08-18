import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(_req: NextRequest) {
  return new NextResponse(
    `<!doctype html><html><head><title>Down for maintenance</title>
    <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#fafafa;}
    .box{text-align:center;color:#444;} h1{font-size:1.4rem;font-weight:600;margin-bottom:.5rem;} p{font-size:.95rem;color:#888;}</style>
    </head><body><div class="box"><h1>Down for maintenance</h1><p>We'll be back shortly.</p></div></body></html>`,
    { status: 503, headers: { "Content-Type": "text/html" } }
  );
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
