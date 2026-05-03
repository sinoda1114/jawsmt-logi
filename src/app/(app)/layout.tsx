import { AppBootstrap } from "@/components/AppBootstrap";
import { AppHeader } from "@/components/AppHeader";
import { AppShippingFooter } from "@/components/AppShippingFooter";

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AppBootstrap />
      <AppHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {children}
      </main>
      <AppShippingFooter />
    </div>
  );
}
