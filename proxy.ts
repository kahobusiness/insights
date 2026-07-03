import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { i18n } from "./i18n-config";
import { match as matchLocale } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";

const LOCALE_COOKIE_NAME = "NEXT_LOCALE";
const STATIC_FILE_REGEX = /\.(png|jpe?g|gif|svg|webp|ico|bmp|txt|xml|json|pdf|woff2?|ttf|eot|mp4|mp3|zip|rar)$/i;

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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 跳过静态资源
  if (
    pathname.startsWith('/_pagefind') ||
    STATIC_FILE_REGEX.test(pathname)
  ) {
    return NextResponse.next();
  }

  // 语言根路径（/en、/zh）→ 保留路径里的语言，永久跳到对应 say-hello。
  //   目标确定，用 308；此前误用 getLocale 重新猜语言，导致 /zh 被跳到 /en/say-hello。
  // 裸根路径（/）→ 语言协商，目标随语言变化，保持 307 临时跳转。
  const rootLocale = i18n.locales.find(
    locale => pathname === `/${locale}` || pathname === `/${locale}/`
  );
  if (pathname === "/" || rootLocale) {
    const locale = rootLocale ?? getLocale(request);
    const url = new URL(`/${locale}/say-hello`, request.url);
    const response = NextResponse.redirect(url, rootLocale ? 308 : 307);
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