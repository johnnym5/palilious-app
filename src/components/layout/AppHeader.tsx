import { UserNav } from "@/components/layout/UserNav";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import AppSidebar from "./AppSidebar";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-lg sm:h-16 sm:px-6">
       <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col p-0">
          <VisuallyHidden asChild>
            <SheetHeader>
              <SheetTitle>Navigation Menu</SheetTitle>
              <SheetDescription>Main navigation links for the application.</SheetDescription>
            </SheetHeader>
          </VisuallyHidden>
          <AppSidebar isMobile />
        </SheetContent>
      </Sheet>
      <div className="flex-1" />
      <UserNav />
    </header>
  );
}
