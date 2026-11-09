import "./globals.css";
import ToastProvider from "@/components/Toasts";
import ThemeProvider from "@/components/ThemeProvider";

export const metadata = { title: "Inquira", description: "Conversational forms" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("inquira-theme")==="dark")document.documentElement.classList.add("dark")}catch{}`,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}