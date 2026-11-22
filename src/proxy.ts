import { NextResponse, type NextRequest } from "next/server";
import { languageForSlug } from "./lib/site-languages";
import { isAdminPath, REQUEST_LANGUAGE_HEADER } from "./lib/admin-i18n/locale";

export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  const pathname = request.nextUrl.pathname;
  const privateWorkspace = isAdminPath(pathname) || pathname === "/members" || pathname.startsWith("/members/");
  const language = privateWorkspace ? "admin" : languageForSlug(pathname.slice(1));
  headers.set(REQUEST_LANGUAGE_HEADER, language);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!api/|_next/|media/|.*\\..*).*)"],
};
