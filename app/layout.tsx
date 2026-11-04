import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TeachGenius AI",
  description: "An AI-powered educational platform for teachers, students and schools."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "Arial, Helvetica, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
