import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { i18n } from "./i18n-config";
import { match as matchLocale } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";

const LOCALE_COOKIE_NAME = "NEXT_LOCALE";

function getLocale(request: NextRequest): string {
  // 1. 优先从 cookie 读取
  const cookieLocale = request.cookies.get(LOCALE_COOKIE_NAME)?.value;
  if (
    cookieLocale &&
    (i18n.locales as readonly string[]).includes(cookieLocale)
  ) {
    return cookieLocale as typeof i18n.locales[number];
  }

  // 2. 从 Accept-Language 头部自动检测
  const negotiatorHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => (negotiatorHeaders[key] = value));
  const locales: string[] = i18n.locales.slice();
  let languages = new Negotiator({ headers: negotiatorHeaders }).languages(locales);
  const locale = matchLocale(languages, locales, i18n.defaultLocale);

  return locale;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 跳过 _pagefind 静态资源
  if (pathname.startsWith('/_pagefind')) {
    return NextResponse.next();
  }

    // 跳过 public 下的静态资源（常见扩展名）
  if (
    pathname.match(/\.(png|jpe?g|gif|svg|webp|ico|bmp|txt|xml|json|pdf|woff2?|ttf|eot|mp4|mp3|zip|rar)$/i)
  ) {
    return NextResponse.next();
  }

  let response: NextResponse | undefined;

  // 访问根路径或语言根路径时，重定向到 say_hello
  for (const locale of i18n.locales) {
    if (pathname === `/${locale}` || pathname === `/${locale}/`) {
      response = NextResponse.redirect(
        new URL(`/${locale}/say_hello`, request.url)
      );
      response.cookies.set(LOCALE_COOKIE_NAME, locale, { path: "/" });
      return response;
    }
  }
  if (pathname === "/") {
    const locale = getLocale(request);
    response = NextResponse.redirect(
      new URL(`/${locale}/say_hello`, request.url)
    );
    response.cookies.set(LOCALE_COOKIE_NAME, locale, { path: "/" });
    return response;
  }

  // 检查路径中是否缺少 locale
  const pathnameIsMissingLocale = i18n.locales.every(
    (locale) =>
      !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`,
  );

  if (pathnameIsMissingLocale) {
    const locale = getLocale(request);
    response = NextResponse.redirect(
      new URL(
        `/${locale}${pathname.startsWith("/") ? "" : "/"}${pathname}`,
        request.url,
      ),
    );
    response.cookies.set(LOCALE_COOKIE_NAME, locale, { path: "/" });
    return response;
  }

  // 如果路径中已包含 locale，则设置 cookie 方便下次使用
  for (const locale of i18n.locales) {
    if (pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`) {
      response = NextResponse.next();
      response.cookies.set(LOCALE_COOKIE_NAME, locale, { path: "/" });
      return response;
    }
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};