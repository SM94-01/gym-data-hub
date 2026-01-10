import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { GymProvider, useGym } from "@/context/GymContext";
import { Header } from "@/components/gym/Header";
import Home from "./pages/Home";
import CreateWorkout from "./pages/CreateWorkout";
import Workout from "./pages/Workout";
import Progress from "./pages/Progress";
import BodyWeight from "./pages/BodyWeight";
import SelectUser from "./pages/SelectUser";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser } = useGym();
  if (!currentUser) {
    return <Navigate to="/select-user" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  const { currentUser } = useGym();

  return (
    <div className="min-h-screen bg-background">
      {currentUser && <Header />}
      <Routes>
        <Route path="/select-user" element={<SelectUser />} />
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/create" element={<ProtectedRoute><CreateWorkout /></ProtectedRoute>} />
        <Route path="/workout" element={<ProtectedRoute><Workout /></ProtectedRoute>} />
        <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
        <Route path="/weight" element={<ProtectedRoute><BodyWeight /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <GymProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </GymProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
