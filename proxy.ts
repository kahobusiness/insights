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
  const headers = { 'accept-language': request.headers.get('accept-language') ?? '' };
  const languages = new Negotiator({ headers }).languages([...i18n.locales]);
  return matchLocale(languages, i18n.locales, i18n.defaultLocale);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 语言根路径（/en、/zh）→ 保留路径里的语言，永久跳到对应 say-hello。
  //   目标确定，用 308；此前误用 getLocale 重新猜语言，导致 /zh 被跳到 /en/say-hello。
  // 裸根路径（/）→ 语言协商，目标随语言变化，保持 307 临时跳转。
  const rootLocale = i18n.locales.find(
    locale => pathname === `/${locale}` || pathname === `/${locale}/`
  );
  if (pathname === "/" || rootLocale) {
    const locale = rootLocale ?? getLocale(request);
    const url = new URL(request.url);
    url.pathname = `/${locale}/say-hello`;
    const response = NextResponse.redirect(url, rootLocale ? 308 : 307);
    rememberLocale(request, response, locale);
    return response;
  }

  // 路径缺少 locale，自动补全
  const missingLocale = i18n.locales.every(
    locale => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );
  if (missingLocale) {
    const locale = getLocale(request);
    const url = new URL(request.url);
    url.pathname = `/${locale}${pathname}`;
    const response = NextResponse.redirect(url);
    rememberLocale(request, response, locale);
    return response;
  }

  // 路径已包含 locale，设置 cookie
  const matchedLocale = i18n.locales.find(
    locale => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );
  if (matchedLocale) {
    const response = NextResponse.next();
    rememberLocale(request, response, matchedLocale);
    return response;
  }
}

function rememberLocale(request: NextRequest, response: NextResponse, locale: string) {
  // Avoid re-sending an unchanged cookie on every page and RSC request.
  if (request.cookies.get(LOCALE_COOKIE_NAME)?.value !== locale) {
    response.cookies.set(LOCALE_COOKIE_NAME, locale, { path: "/" });
  }
}

export const config = {
  // Exclude assets before invoking Proxy, rather than paying for an invocation
  // just to return next(). _vercel includes Analytics and Speed Insights.
  matcher: ["/((?!api(?:/|$)|_next(?:/|$)|_vercel(?:/|$)|_pagefind(?:/|$)|\\.well-known(?:/|$)|.*\\.(?:[pP][nN][gG]|[jJ][pP][eE]?[gG]|[gG][iI][fF]|[sS][vV][gG]|[wW][eE][bB][pP]|[aA][vV][iI][fF]|[iI][cC][oO]|[bB][mM][pP]|[tT][xX][tT]|[xX][mM][lL]|[jJ][sS][oO][nN]|[pP][dD][fF]|[wW][oO][fF][fF]2?|[tT][tT][fF]|[eE][oO][tT]|[mM][pP]4|[mM][pP]3|[zZ][iI][pP]|[rR][aA][rR]|[cC][sS][sS]|[jJ][sS]|[mM][jJ][sS]|[mM][aA][pP])$).*)"],
};
