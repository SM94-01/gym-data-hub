export const APP_VERSION = "2.1.3";

export function AppVersion() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="py-4 text-center text-muted-foreground text-xs">
      <div>© {currentYear} GymApp</div>
    </div>
  );
}
