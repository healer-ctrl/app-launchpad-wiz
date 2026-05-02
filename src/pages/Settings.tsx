import { ArrowLeft, Bell } from "lucide-react";
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/hooks/useSettings";
import { useNseStatus } from "@/hooks/useNseStatus";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface SettingsProps {
  onBack: () => void;
}

const Settings = ({ onBack }: SettingsProps) => {
  const { useMockData, toggleMockData } = useSettings();
  const { data: nseStatus } = useNseStatus();
  const { enabled: pushEnabled, supported: pushSupported, loading: pushLoading, toggle: togglePush } =
    usePushNotifications();

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed inset-0 z-[60] bg-background overflow-y-auto"
    >
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={onBack} className="p-1 -ml-1 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold font-['Space_Grotesk'] text-foreground tracking-tight">Settings</h1>
        </div>
      </header>

      <div className="px-5 py-6 space-y-6">
        {/* Notifications */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Notifications
          </h2>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">New report alerts</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {!pushSupported
                      ? "Available in the installed mobile app"
                      : pushEnabled
                        ? "You'll get a push the moment a new report lands"
                        : "Get notified instantly when a new report is ready"}
                  </p>
                </div>
              </div>
              <Switch
                checked={pushEnabled}
                disabled={pushLoading || !pushSupported}
                onCheckedChange={(v) => togglePush(v)}
              />
            </div>
          </div>
        </section>

        {/* Developer Options */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Developer Options
          </h2>

          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            {/* Mock Data Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Use Mock Data</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {useMockData ? "Using local sample data" : "Using live database (coming soon)"}
                </p>
              </div>
              <Switch checked={useMockData} onCheckedChange={toggleMockData} />
            </div>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* NSE Feed Status */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">NSE Feed Status</p>
                {nseStatus?.timeAgo && (
                  <p className="text-xs text-muted-foreground mt-0.5">Last updated {nseStatus.timeAgo}</p>
                )}
              </div>
              <span className={`text-xs font-medium flex items-center gap-1.5 ${
                nseStatus?.status === "live" ? "text-green-400" :
                nseStatus?.status === "delayed" ? "text-yellow-400" : "text-red-400"
              }`}>
                {nseStatus?.emoji ?? "🔴"} {nseStatus?.label ?? "Not Connected"}
              </span>
            </div>
          </div>
        </section>
      </div>
    </motion.div>
  );
};

export default Settings;
