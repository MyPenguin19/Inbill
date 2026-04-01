import type { Metadata, Viewport } from "next";
import Layout from "@/components/Layout";
import "./globals.css";

export const metadata: Metadata = {
  title: "BillFixa — Fix Medical Bill Errors Before You Pay",
  description:
    "Upload your medical bill and detect hidden charges, duplicate fees, and insurance errors. Fix costly billing mistakes before you pay.",
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
