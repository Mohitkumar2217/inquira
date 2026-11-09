import "./globals.css";
import ToastProvider from "@/components/Toasts";

export const metadata = { title: "Inquira", description: "Conversational forms" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body><ToastProvider>{children}</ToastProvider></body></html>);
}
