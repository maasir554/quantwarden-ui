// middleware.ts  (root of your project, same level as app/)
import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const session = req.cookies.get("session");
  const isAuthPage = req.nextUrl.pathname.startsWith("/login");

  // Not logged in → redirect to login
  if (!session && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Already logged in → don't show login page again
  if (session && isAuthPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

// Apply middleware to all routes EXCEPT api + static files
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};