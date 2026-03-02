import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // In a real app, this layout would be a server component that fetches
  // the user session and redirects to /login if not authenticated.
  // For this demo, we'll assume the user is logged in.

  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      <div className="flex flex-1 flex-col">
        <AppHeader />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
