import { NextResponse, type NextRequest } from "next/server";

// Reicht den angefragten Pfad als Header an Server Components durch, damit
// eine erzwungene Anmeldung nach dem Login dorthin zurückführen kann.
export function proxy(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.set("x-pathname", req.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.svg|logo.png|logo.svg|api/health).*)"],
};
