"use client";

import { useEffect, useState } from "react";
import { User, Mail, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createUser, getUserByEmail, updateUser } from "@/utils/db/actions";
import { useUser } from "../context/userContext";
import toast from "react-hot-toast";

type UserSettings = {
  name: string;
  email: string;
  notifications: boolean;
};
function getItemWithExpiry(key: string): string | null {
  const itemStr = localStorage.getItem(key);

  if (!itemStr) return null;

  const item = JSON.parse(itemStr);
  const now = new Date();

  if (now.getTime() > item.expiry) {
    localStorage.removeItem(key);
    toast.error("Session expired. Please login again. 😕");
    return null;
  }

  return item.value;
}
export default function SettingsPage() {
  const { user, setUser } = useUser();
  const [settings, setSettings] = useState<UserSettings>({
    name: user?.name || "",
    email: user?.email || "",
    notifications: true,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!user) {
        alert("User not found!");
        return;
      }

      const updatedUser = await updateUser(
        settings.email,
        settings.name,
        user.id
      );
      if (updatedUser) {
        setUser(updatedUser);
        alert("Settings updated successfully!");
        window.location.reload();
      }
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Failed to update settings.");
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      const email = getItemWithExpiry("userEmail");
      if (email) {
        try {
          let existingUser = await getUserByEmail(email);
          if (!existingUser) {
            existingUser = await createUser(email, "Anonymous User");
          }
          setUser(existingUser);
          setSettings({
            name: existingUser?.name as string,
            email: existingUser?.email as string,
            notifications: true,
          });
        } catch (error) {
          console.error("Error fetching user:", error);
        }
      }
    };

    fetchUser();
  }, [setUser]);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-semibold mb-6 text-gray-800">
        Account Settings
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Full Name
          </label>
          <div className="relative">
            <input
              type="text"
              id="name"
              name="name"
              value={settings.name}
              onChange={handleInputChange}
              className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
            />
            <User
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={18}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Email Address
          </label>
          <div className="relative">
            <input
              type="email"
              id="email"
              name="email"
              value={settings.email}
              onChange={handleInputChange}
              className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
            />
            <Mail
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={18}
            />
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="notifications"
            name="notifications"
            checked={settings.notifications}
            onChange={handleInputChange}
            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
          />
          <label
            htmlFor="notifications"
            className="ml-2 block text-sm text-gray-700"
          >
            Receive email notifications
          </label>
        </div>

        <Button
          type="submit"
          className="w-full bg-green-500 hover:bg-green-600 text-white"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </form>
    </div>
  );
}
