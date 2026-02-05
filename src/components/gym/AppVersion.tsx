export const APP_VERSION = "1.0.0";

export function AppVersion() {
  const today = new Date();
  const formattedDate = today.toISOString().split("T")[0]; // YYYY-MM-DD
  const currentYear = today.getFullYear();

  return (
    <div className="py-4 text-center text-muted-foreground text-xs space-y-1">
      <div>© {currentYear} GymApp</div>
      <div>
        v{APP_VERSION} ({formattedDate})
      </div>
    </div>
  );
}
