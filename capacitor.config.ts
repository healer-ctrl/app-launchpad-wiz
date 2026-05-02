import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.500fd66701e543bc946e191d9062d4f8",
  appName: "FinPulse",
  webDir: "dist",
  server: {
    url: "https://500fd667-01e5-43bc-946e-191d9062d4f8.lovableproject.com?forceHideBadge=true",
    cleartext: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
