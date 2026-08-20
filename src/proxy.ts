import { NextRequest, NextResponse } from "next/server";
import {
  buildContentSecurityPolicy,
  shouldUseDevelopmentCsp,
} from "@/lib/content-security-policy";

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const contentSecurityPolicy = buildContentSecurityPolicy({
    backendOrigin: process.env.NEXT_PUBLIC_API_URL,
    isDevelopment: shouldUseDevelopmentCsp({
      allowInsecureLoopback: process.env.E2E_ALLOW_INSECURE_LOOPBACK,
      hostname: request.nextUrl.hostname,
      nodeEnvironment: process.env.NODE_ENV,
    }),
    nonce,
  });
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|branding/).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
