"use client";

type MenuItem = {
  name: string;
  icon: string;
  path: string;
};

const menuItems: MenuItem[] = [
  { name: "Dashboard", icon: "📊", path: "/dashboard" },
  { name: "Checkout", icon: "🏷️", path: "/discounts" },
  { name: "Settings", icon: "⚙️", path: "/settings" },
  { name: "Profile", icon: "👤", path: "/profile" },
  { name: "Help", icon: "❓", path: "/help" },
];

interface SidebarProps {
  activePage: string;
  onMenuItemClick: (page: string) => void;
}

export const Sidebar = ({ activePage, onMenuItemClick }: SidebarProps) => {
  return (
    <div className="h-full w-64 bg-gray-100 p-4 shadow-md">
      <div className="mb-6 flex items-center">
        <span className="text-xl font-bold text-black">Gumroad</span>
      </div>
      <nav>
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.name}>
              <button
                className={`flex w-full items-center rounded-md px-4 py-2 text-left ${
                  activePage === item.name ? "bg-blue-100 font-medium text-blue-600" : "text-gray-700 hover:bg-gray-200"
                }`}
                onClick={() => onMenuItemClick(item.name)}
              >
                <span className="mr-3">{item.icon}</span>
                {item.name}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};
