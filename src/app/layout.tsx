import type { Metadata } from "next";
import "./globals.css";
import "./cinematic.css";

export const metadata: Metadata = {
  title: "Shadow Group",
  description: "Shadow Group airsoft milsim team, events, roster, recruitment, sponsors, and card archive."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
