import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications, type Token } from "@capacitor/push-notifications";
import { Preferences } from "@capacitor/preferences";
import { Device } from "@capacitor/device";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ENABLED_KEY = "finpulse_push_enabled";
const INSTALL_ID_KEY = "finpulse_install_id";

async function getInstallId(): Promise<string> {
  const { value } = await Preferences.get({ key: INSTALL_ID_KEY });
  if (value) return value;
  const id =
    (typeof crypto !== "undefined" && "randomUUID" in crypto)
      ? crypto.randomUUID()
      : `inst_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  await Preferences.set({ key: INSTALL_ID_KEY, value: id });
  return id;
}

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export function usePushNotifications() {
  const [enabled, setEnabled] = useState(false);
  const [supported, setSupported] = useState(false);
  const [loading, setLoading] = useState(false);

  // Hydrate stored preference
  useEffect(() => {
    setSupported(Capacitor.isNativePlatform());
    Preferences.get({ key: ENABLED_KEY }).then(({ value }) => {
      setEnabled(value === "true");
    });
  }, []);

  // Wire native listeners once if enabled
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !enabled) return;

    const registrationHandle = PushNotifications.addListener("registration", async (token: Token) => {
      try {
        const installId = await getInstallId();
        const info = await Device.getInfo();
        const platform = info.platform === "ios" ? "ios" : "android";
        await supabase.from("device_tokens").upsert(
          { install_id: installId, token: token.value, platform, enabled: true },
          { onConflict: "install_id" }
        );
      } catch (err) {
        console.error("Failed to save push token:", err);
      }
    });

    const errorHandle = PushNotifications.addListener("registrationError", (err) => {
      console.error("Push registration error:", err);
      toast.error("Couldn't enable notifications");
    });

    const receivedHandle = PushNotifications.addListener("pushNotificationReceived", (n) => {
      toast(n.title ?? "New report ready", { description: n.body });
    });

    return () => {
      registrationHandle.then((h) => h.remove());
      errorHandle.then((h) => h.remove());
      receivedHandle.then((h) => h.remove());
    };
  }, [enabled]);

  const enable = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      toast.info("Open the app on your phone to enable notifications");
      return false;
    }
    setLoading(true);
    try {
      let perm = await PushNotifications.checkPermissions();
      if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
        perm = await PushNotifications.requestPermissions();
      }
      if (perm.receive !== "granted") {
        toast.error("Notification permission denied");
        return false;
      }
      await PushNotifications.register();
      await Preferences.set({ key: ENABLED_KEY, value: "true" });
      setEnabled(true);
      toast.success("Notifications on — you'll be pinged for new reports");
      return true;
    } finally {
      setLoading(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setLoading(true);
    try {
      if (Capacitor.isNativePlatform()) {
        try {
          await PushNotifications.removeAllListeners();
        } catch {}
        const installId = await getInstallId();
        await supabase.from("device_tokens").update({ enabled: false }).eq("install_id", installId);
      }
      await Preferences.set({ key: ENABLED_KEY, value: "false" });
      setEnabled(false);
      toast.success("Notifications turned off");
    } finally {
      setLoading(false);
    }
  }, []);

  const toggle = useCallback(
    async (next: boolean) => (next ? enable() : disable()),
    [enable, disable]
  );

  return { enabled, supported, loading, toggle };
}
