import { logout } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  const handleLogout = () => {
    if (confirm("Are you sure you want to logout?")) {
      logout();
    }
  };

  return (
    <Button
      onClick={handleLogout}
      variant="ghost"
      size="sm"
      className="text-red-400 hover:text-red-300 hover:bg-red-950"
    >
      <LogOut className="w-4 h-4 mr-2" />
      Logout
    </Button>
  );
}
