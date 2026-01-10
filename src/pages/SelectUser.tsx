import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGym } from "@/context/GymContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dumbbell, User, Plus, Check } from "lucide-react";
import { toast } from "sonner";

export default function SelectUser() {
  const navigate = useNavigate();
  const { users, addUser, selectUser } = useGym();
  const [newUserName, setNewUserName] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const handleSelectUser = () => {
    if (!selectedUserId) {
      toast.error("Seleziona un utente");
      return;
    }
    selectUser(selectedUserId);
    toast.success("Benvenuto!");
    navigate("/");
  };

  const handleAddUser = async () => {
    if (!newUserName.trim()) {
      toast.error("Inserisci un nome");
      return;
    }
    const user = await addUser(newUserName.trim());
    if (user) {
      toast.success(`Utente "${user.name}" creato!`);
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full" />
            <Dumbbell className="w-16 h-16 text-primary relative z-10 mx-auto" />
          </div>
          <h1 className="font-display text-4xl font-bold mt-4">
            Gym<span className="text-primary">App</span>
          </h1>
          <p className="text-muted-foreground mt-2">Seleziona il tuo profilo per iniziare</p>
        </div>

        {/* User Selection */}
        {users.length > 0 && (
          <div className="glass-card rounded-2xl p-6 mb-6 animate-slide-up">
            <Label className="text-sm font-medium text-muted-foreground mb-4 block">Seleziona Utente</Label>
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  onClick={() => setSelectedUserId(user.id)}
                  className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all ${
                    selectedUserId === user.id
                      ? "bg-primary/20 border border-primary/50"
                      : "bg-secondary/50 hover:bg-secondary"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      selectedUserId === user.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Creato il {new Date(user.createdAt).toLocaleDateString("it-IT")}
                    </p>
                  </div>
                  {selectedUserId === user.id && <Check className="w-5 h-5 text-primary" />}
                </div>
              ))}
            </div>
            <Button onClick={handleSelectUser} className="w-full mt-4" disabled={!selectedUserId}>
              Continua
            </Button>
          </div>
        )}

        {/* Create New User */}
        <div className="glass-card rounded-2xl p-6 animate-slide-up" style={{ animationDelay: "100ms" }}>
          <Label className="text-sm font-medium text-muted-foreground mb-4 block">
            {users.length > 0 ? "Oppure crea un nuovo utente" : "Crea il tuo profilo"}
          </Label>
          <div className="flex gap-3">
            <Input
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="Il tuo nome"
              className="bg-secondary/50 border-border/50"
              onKeyDown={(e) => e.key === "Enter" && handleAddUser()}
            />
            <Button onClick={handleAddUser} className="shrink-0">
              <Plus className="w-4 h-4 mr-2" />
              Crea
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
