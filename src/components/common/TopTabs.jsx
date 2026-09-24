'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TopTabs() {
  const pathname = usePathname();

  const tabs = [
    { name: "Products", href: "/products" },
    { name: "Service Boys", href: "/service-boys" },
    { name: "Hostesses", href: "/hostesses" },
  ];

  return (
    <div className="fixed top-14 left-0 w-full bg-white z-40 border-b">
      <div className="flex justify-around text-sm font-medium">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex-1 text-center py-3 transition
                ${isActive
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600"
                }
              `}
            >
              {tab.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
