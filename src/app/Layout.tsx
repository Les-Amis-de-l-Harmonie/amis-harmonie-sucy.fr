import type { LayoutProps } from "rwsdk/router";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
