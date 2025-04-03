"use client";

import { useState } from "react";
import { SettingsForm } from "./SettingsForm";
import { Sidebar } from "./Sidebar";

export const AppLayout = () => {
  const [activePage, setActivePage] = useState("Dashboard");

  const renderContent = () => {
    switch (activePage) {
      case "Settings":
        return <SettingsForm />;
      case "Dashboard":
        return (
          <div className="p-6">
            <h2 className="mb-4 text-2xl font-bold">Dashboard</h2>
            <p className="text-gray-600">Welcome to your Gumroad dashboard!</p>
          </div>
        );
      case "Profile":
        return (
          <div className="p-6">
            <h2 className="mb-4 text-2xl font-bold">Profile</h2>
            <p className="text-gray-600">Your profile information</p>
          </div>
        );
      case "Help":
        return (
          <div className="p-6">
            <h2 className="mb-4 text-2xl font-bold">Help & Support</h2>
            <p className="text-gray-600">Need help? Contact our support team.</p>
          </div>
        );
      default:
        return <div className="p-6">Page not found</div>;
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar onMenuItemClick={setActivePage} activePage={activePage} />
      <main className="flex-1 overflow-auto bg-gray-50 p-6">{renderContent()}</main>
    </div>
  );
};
