import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Trash, Coins, Medal, Settings, Home } from "lucide-react";

const sidebarItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/report", icon: MapPin, label: "Report Waste" },
  { href: "/collect", icon: Trash, label: "Collect Waste" },
  { href: "/rewards", icon: Coins, label: "Rewards" },
  { href: "/leaderboard", icon: Medal, label: "Leaderboard" },
];

interface SidebarProps {
  open: boolean;
}

export default function Sidebar({ open }: SidebarProps) {
  const pathname = usePathname();

  const [quote, setQuote] = useState<string>(
    "🌱 Protect the planet; it's the only one we have.  🌿"
  );
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const response = await fetch(
          "https://api.api-ninjas.com/v1/quotes",
          // "https://api.api-ninjas.com/v1/quotes?category=environmental",
          {
            headers: {
              "X-Api-Key": "lbg+72a8AyfDDU4aVkZY+Q==UUkd9zUJTp9o82JO",
            },
          }
        );
        if (response.ok) {
          const data = await response.json();
          if (data.length > 0) {
            setQuote(`🌱 ${data[0].quote} 🌿`);
          }
        }
      } catch (error) {
        console.error("Failed to fetch quote:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuote();

    // Refresh the quote every 8 seconds
    const interval = setInterval(fetchQuote, 8000);

    return () => clearInterval(interval);
  }, []);

  return (
    <aside
      className={`bg-white border-r pt-20 border-gray-200 text-gray-800 w-64 fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out ${
        open ? "translate-x-0" : "-translate-x-full"
      } lg:translate-x-0`}
    >
      <nav className="h-full flex flex-col justify-between">
        <div className="px-4 py-6 space-y-8">
          {sidebarItems.map((item) => (
            <Link key={item.href} href={item.href} passHref>
              <Button
                variant={pathname === item.href ? "secondary" : "ghost"}
                className={`w-full justify-start py-3 ${
                  pathname === item.href
                    ? "bg-green-100 text-green-800"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <item.icon className="mr-3 h-5 w-5" />
                <span className="text-base">{item.label}</span>
              </Button>
            </Link>
          ))}

          {/* Quote Box */}
          <div className="bg-green-100 text-green-800 p-4 rounded-lg shadow-md mt-8 border border-green-200 transition-transform hover:scale-105">
            <p className="text-sm leading-relaxed italic text-center">
              {loading ? (
                <span>🌱 Loading inspiring quotes...</span>
              ) : (
                <span>{quote}</span>
              )}
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200">
          <Link href="/settings" passHref>
            <Button
              variant={pathname === "/settings" ? "secondary" : "outline"}
              className={`w-full py-3 ${
                pathname === "/settings"
                  ? "bg-green-100 text-green-800"
                  : "text-gray-600 border-gray-300 hover:bg-gray-100"
              }`}
            >
              <Settings className="mr-3 h-5 w-5" />
              <span className="text-base">Settings</span>
            </Button>
          </Link>
        </div>
      </nav>
    </aside>
  );
}
