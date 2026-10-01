import "./globals.css";
import Providers from "@/components/Providers.jsx";
import AuthBootstrap from "@/components/AuthBootstrap.jsx";

export const metadata = {
  title: "Override AI",
  description: "ChatGPT-style AI Assistant with multi-turn chat, file analysis, and web search.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="h-full bg-black text-zinc-100 overflow-hidden">
        <Providers>
          <AuthBootstrap>
            {children}
          </AuthBootstrap>
        </Providers>
      </body>
    </html>
  );
}
