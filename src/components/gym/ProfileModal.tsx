import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Mail, User, Lock, Eye, EyeOff, Save, LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const profileSchema = z.object({
  name: z.string().trim().min(1, "Inserisci il tuo nome").max(50, "Nome troppo lungo"),
  email: z.string().trim().email("Email non valida").optional().or(z.literal("")),
});

const passwordSchema = z.object({
  newPassword: z.string().min(6, "La password deve avere almeno 6 caratteri"),
});

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
  const { user, updateProfile, updatePassword, signOut } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (open && user) {
      // Set email from auth user (email is no longer stored in profiles table)
      setEmail(user.email || "");
      
      // Fetch name from profile data
      supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setName(data.name || "");
          }
        });
    }
  }, [open, user]);

  const handleSaveProfile = async () => {
    const validation = profileSchema.safeParse({ name, email: email || undefined });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setSaving(true);
    const { error } = await updateProfile({ name, email: email || undefined });
    setSaving(false);

    if (error) {
      toast.error("Errore nel salvataggio del profilo");
    } else {
      toast.success("Profilo aggiornato!");
      onOpenChange(false);
    }
  };

  const handleChangePassword = async () => {
    const validation = passwordSchema.safeParse({ newPassword });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setSavingPassword(true);
    const { error } = await updatePassword(newPassword);
    setSavingPassword(false);

    if (error) {
      toast.error("Errore nel cambio password");
    } else {
      toast.success("Password aggiornata!");
      setNewPassword("");
    }
  };

  const handleLogout = async () => {
    await signOut();
    onOpenChange(false);
    toast.success("Logout effettuato");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Il tuo profilo</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Profile Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Nome</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Il tuo nome"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="profile-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="la.tua@email.it"
                  className="pl-10"
                />
              </div>
            </div>

            <Button onClick={handleSaveProfile} disabled={saving} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Salvataggio..." : "Salva Profilo"}
            </Button>
          </div>

          <Separator />

          {/* Change Password */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Cambia Password</h3>
            <div className="space-y-2">
              <Label htmlFor="new-password">Nuova Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              onClick={handleChangePassword}
              disabled={savingPassword || !newPassword}
              variant="secondary"
              className="w-full"
            >
              {savingPassword ? "Aggiornamento..." : "Cambia Password"}
            </Button>
          </div>

          <Separator />

          {/* Logout */}
          <Button onClick={handleLogout} variant="destructive" className="w-full">
            <LogOut className="w-4 h-4 mr-2" />
            Esci
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
