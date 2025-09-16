'use client'
import React from 'react';
import { SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "@/components/Application/Admin/AppSidebar";
import Topbar from "@/components/Application/Admin/Topbar";
import { useSelector } from "react-redux";
import { usePathname } from "next/navigation";

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const role = useSelector((s) => s?.auth?.user?.role) || null;

  // Same logic used in AppSidebar
  const isSupportContext =
    role === 'support' || (pathname && pathname.startsWith('/admin/support'));

  return (
    <div className="flex">
      <SidebarProvider>
        <AppSidebar />
        <main
          className={`${isSupportContext ? 'w-full' : 'md:w-[calc(100vw-16rem)] w-full'} overflow-x-hidden`}
        >
          <div className="pt-[70px] md:px-8 px-5 min-h-[calc(100vh-40px)] pb-10">
            <Topbar />
            {children}
          </div>
        </main>
      </SidebarProvider>
    </div>
  );
}
