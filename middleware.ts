import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { i18n } from "./i18n-config";
import { match as matchLocale } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";

const LOCALE_COOKIE_NAME = "NEXT_LOCALE";

// 获取有效的 locale，优先从 cookie 和 Accept-Language 中获取
function getLocale(request: NextRequest): string {
  // 1. 优先从 cookie 读取
  const cookieLocale = request.cookies.get(LOCALE_COOKIE_NAME)?.value;
  if (cookieLocale && i18n.locales.includes(cookieLocale)) {
    return cookieLocale;
  }

  // 2. 从 Accept-Language 头部自动检测
  const negotiator = new Negotiator({ headers: request.headers });
  const preferredLocales = negotiator.languages(i18n.locales.slice());
  return matchLocale(preferredLocales, i18n.locales, i18n.defaultLocale);
}

// 路径是否已经包含 locale 前缀
function hasLocalePrefix(pathname: string): boolean {
  return i18n.locales.some(locale => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`);
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 跳过静态资源
  if (
    pathname.startsWith('/_pagefind') ||
    pathname.match(/\.(png|jpe?g|gif|svg|webp|ico|bmp|txt|xml|json|pdf|woff2?|ttf|eot|mp4|mp3|zip|rar)$/i)
  ) {
    return NextResponse.next();
  }

  // 访问根路径或语言根路径时，重定向到 say-hello
  if (i18n.locales.some(locale => pathname === `/${locale}` || pathname === `/${locale}/`)) {
    const locale = i18n.locales.find(locale => pathname === `/${locale}` || pathname === `/${locale}/`);
    const response = NextResponse.redirect(new URL(`/${locale}/say-hello`, request.url));
    response.cookies.set(LOCALE_COOKIE_NAME, locale!, { path: "/" });
    return response;
  }

  // 访问根路径时，重定向到默认语言的 say-hello 页面
  if (pathname === "/") {
    const locale = getLocale(request);
    const response = NextResponse.redirect(new URL(`/${locale}/say-hello`, request.url));
    response.cookies.set(LOCALE_COOKIE_NAME, locale, { path: "/" });
    return response;
  }

  // 检查路径中是否缺少 locale
  if (!hasLocalePrefix(pathname)) {
    const locale = getLocale(request);
    const response = NextResponse.redirect(new URL(`/${locale}${pathname}`, request.url));
    response.cookies.set(LOCALE_COOKIE_NAME, locale, { path: "/" });
    return response;
  }

  // 如果路径已包含 locale，设置 cookie 方便下次使用
  const locale = pathname.split("/")[1];
  if (i18n.locales.includes(locale)) {
    const response = NextResponse.next();
    response.cookies.set(LOCALE_COOKIE_NAME, locale, { path: "/" });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
