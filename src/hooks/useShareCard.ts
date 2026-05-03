import { useCallback, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { toast } from "sonner";
import type { CompanyData } from "@/data/mockFinancials";

export const useShareCard = () => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pendingCompany, setPendingCompany] = useState<CompanyData | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const share = useCallback(async (company: CompanyData) => {
    setPendingCompany(company);
    // wait a tick for off-screen card to render
    await new Promise((r) => setTimeout(r, 80));

    try {
      setIsSharing(true);
      if (!ref.current) throw new Error("Snapshot node missing");

      const dataUrl = await toPng(ref.current, {
        cacheBust: true,
        pixelRatio: 1,
        width: 1080,
        height: 1350,
      });

      const filename = `finpulse-${company.ticker.replace(/[^a-z0-9]/gi, "")}-${company.quarter.replace(/\s+/g, "")}.png`;
      const text = `${company.name} (${company.ticker}) — ${company.headline}\n\nvia FinPulse`;

      if (Capacitor.isNativePlatform()) {
        // Write file to cache, then share via native sheet
        const base64 = dataUrl.split(",")[1];
        const written = await Filesystem.writeFile({
          path: filename,
          data: base64,
          directory: Directory.Cache,
        });
        await Share.share({
          title: `${company.name} — ${company.quarter}`,
          text,
          url: written.uri,
          dialogTitle: "Share earnings summary",
        });
      } else {
        // Web: try Web Share API with file, fall back to download
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], filename, { type: "image/png" });

        // @ts-ignore — canShare is not in all TS lib versions
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: company.name, text });
        } else {
          const a = document.createElement("a");
          a.href = dataUrl;
          a.download = filename;
          a.click();
          toast.success("Image saved");
        }
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        console.error("Share failed:", err);
        toast.error("Couldn't share image");
      }
    } finally {
      setIsSharing(false);
      setPendingCompany(null);
    }
  }, []);

  return { ref, pendingCompany, isSharing, share };
};
