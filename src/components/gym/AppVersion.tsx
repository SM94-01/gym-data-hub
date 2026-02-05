export const APP_VERSION = "1.0.0";

export function AppVersion() {
  const today = new Date();
  const formattedDate = today.toISOString().split("T")[0]; // YYYY-MM-DD

  return (
    <div className="py-4 text-center text-muted-foreground text-xs">
      v{APP_VERSION} ({formattedDate})
    </div>
  );
}
