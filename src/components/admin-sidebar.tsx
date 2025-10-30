'use client';

import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Logo } from './logo';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Image as ImageIcon, User, Home } from 'lucide-react';
import Link from 'next/link';

export function AdminSidebar() {
  const pathname = usePathname();

  const menuItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutGrid },
    { href: '/admin/images', label: 'Images', icon: ImageIcon },
  ];

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center justify-between">
          <Logo />
          <SidebarTrigger />
        </div>
      </SidebarHeader>
      <SidebarMenu>
        {menuItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href} legacyBehavior passHref>
              <SidebarMenuButton
                isActive={pathname === item.href}
                icon={<item.icon />}
                tooltip={item.label}
              >
                {item.label}
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
             <Link href="/" legacyBehavior passHref>
               <SidebarMenuButton icon={<Home />} tooltip="Back to Site">
                Back to Site
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton icon={<User />} tooltip="Profile">
              Admin User
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
