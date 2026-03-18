import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Mail, User } from "lucide-react";

const Account = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-lg font-semibold">Account Settings</h1>
        </div>
      </header>

      <main className="container py-8 max-w-lg">
        <Card className="p-6 space-y-4">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <User className="h-4 w-4" /> Profile
          </h2>
          <div className="space-y-2">
            <Label>Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input value={user?.email || ""} disabled className="pl-9 bg-muted/50" />
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Account;
