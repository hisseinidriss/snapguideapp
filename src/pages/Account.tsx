import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/services/backend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Lock, Mail, User, LogOut } from "lucide-react";

const Account = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated", description: "Your password has been changed." });
      setNewPassword("");
    }
    setSaving(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

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
        <div className="space-y-6">
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
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={user?.user_metadata?.full_name || "—"} disabled className="bg-muted/50" />
            </div>
            <p className="text-xs text-muted-foreground">
              Joined {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
            </p>
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Lock className="h-4 w-4" /> Change Password
            </h2>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
              <Button type="submit" disabled={saving} size="sm">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Password
              </Button>
            </form>
          </Card>

          <Card className="p-6">
            <Button variant="destructive" onClick={handleSignOut} className="w-full">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Account;
