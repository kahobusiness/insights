import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { i18n } from "./i18n-config";
import { match as matchLocale } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";

const LOCALE_COOKIE_NAME = "NEXT_LOCALE";

function getLocale(request: NextRequest): string {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE_NAME)?.value;
  // 优先从 cookie 读取有效语言
  if (
    cookieLocale &&
    (i18n.locales as readonly string[]).includes(cookieLocale)
  ) {
    return cookieLocale as typeof i18n.locales[number];
  }

  // 从请求头自动检测语言
  const headers: Record<string, string> = {};
  request.headers.forEach((v, k) => (headers[k] = v));
  const languages = new Negotiator({ headers }).languages([...i18n.locales]);
  return matchLocale(languages, i18n.locales, i18n.defaultLocale);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 跳过静态资源
  if (
    pathname.startsWith('/_pagefind') ||
    pathname.match(/\.(png|jpe?g|gif|svg|webp|ico|bmp|txt|xml|json|pdf|woff2?|ttf|eot|mp4|mp3|zip|rar)$/i)
  ) {
    return NextResponse.next();
  }

  // 根路径或语言根路径重定向到 say-hello
  if (pathname === "/" || i18n.locales.some(locale => pathname === `/${locale}` || pathname === `/${locale}/`)) {
    const locale = getLocale(request);
    const url = new URL(`/${locale}/say-hello`, request.url);
    const response = NextResponse.redirect(url);
    response.cookies.set(LOCALE_COOKIE_NAME, locale, { path: "/" });
    return response;
  }

  // 路径缺少 locale，自动补全
  const missingLocale = i18n.locales.every(
    locale => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );
  if (missingLocale) {
    const locale = getLocale(request);
    const url = new URL(`/${locale}${pathname.startsWith("/") ? "" : "/"}${pathname}`, request.url);
    const response = NextResponse.redirect(url);
    response.cookies.set(LOCALE_COOKIE_NAME, locale, { path: "/" });
    return response;
  }

  // 路径已包含 locale，设置 cookie
  const matchedLocale = i18n.locales.find(
    locale => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );
  if (matchedLocale) {
    const response = NextResponse.next();
    response.cookies.set(LOCALE_COOKIE_NAME, matchedLocale, { path: "/" });
    return response;
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};