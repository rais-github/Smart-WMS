import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Mawastore",
  description: "Smart Waste Management System",
  icons: {
    icon: "/logo.svg",
  },
};

import ClientLayout from "./ClientLayout";
import { UserProvider } from "./context/userContext";
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <UserProvider>
          <ClientLayout>{children}</ClientLayout>
        </UserProvider>
      </body>
    </html>
  );
}
