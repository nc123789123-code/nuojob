"use client";
import { Analytics } from "@vercel/analytics/next";

export default function AnalyticsProvider() {
  return (
    <Analytics
      beforeSend={() => {
        if (typeof localStorage !== "undefined" && localStorage.getItem("onlu_dev") === "1") return null;
        return null as never;
      }}
    />
  );
}
