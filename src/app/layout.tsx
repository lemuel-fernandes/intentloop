import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IntentLoop | Mission Control",
  description: "Agentic customer acquisition, conversion, and retention operations.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
