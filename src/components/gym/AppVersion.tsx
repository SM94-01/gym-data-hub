export const APP_VERSION = "2.0.0";

export function AppVersion() {
  return (
    <div className="py-4 text-center text-muted-foreground text-xs">
      v{APP_VERSION}
    </div>
  );
}
