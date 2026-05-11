"use client";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  TooltipProvider,
} from "@/components/ui";
import AdminSidebar from "./AdminSidebar";

type AdminLayoutProps = {
  children: React.ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen>
        <AdminSidebar />
        <SidebarInset className="bg-slate-50">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 md:px-6">
            <SidebarTrigger className="-ml-1" />
          </header>
          <main className="flex-1 overflow-auto">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
