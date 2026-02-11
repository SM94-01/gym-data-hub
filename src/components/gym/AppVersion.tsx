export const APP_VERSION = "1.0.0";

export function AppVersion() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="py-4 text-center text-muted-foreground text-xs">
      <div>© {currentYear} GymApp</div>
    </div>
  );
}
