import { Router } from "express";
import { db } from "@workspace/db";
import { cmsSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticate, requireRole } from "../middlewares/auth";

const router = Router();

const CMS_KEYS = [
  "siteName", "siteNameAr", "logoUrl", "faviconUrl",
  "heroTitle", "heroTitleAr", "heroSubtitle", "heroSubtitleAr",
  "aboutUs", "aboutUsAr", "termsConditions", "termsConditionsAr",
  "privacyPolicy", "privacyPolicyAr",
  "contactEmail", "contactPhone", "contactAddress",
  "facebookUrl", "twitterUrl", "instagramUrl", "youtubeUrl", "whatsappNumber",
  "statsCustomers", "statsTechnicians", "statsRequests", "statsGovernorates", "statsUseCustom",
  "footerAboutUs", "footerFaq",
];

async function getSettings() {
  const rows = await db.select().from(cmsSettingsTable);
  const map: Record<string, string | null> = {};
  CMS_KEYS.forEach((k) => (map[k] = null));
  rows.forEach((r) => (map[r.key] = r.value ?? null));
  return map;
}

router.get("/cms/settings", async (_req, res) => {
  try {
    const settings = await getSettings();
    return res.json(settings);
  } catch {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.patch("/cms/settings", authenticate, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const updates = req.body as Record<string, string>;
    for (const [key, value] of Object.entries(updates)) {
      if (!CMS_KEYS.includes(key)) continue;
      const existing = await db.select().from(cmsSettingsTable).where(eq(cmsSettingsTable.key, key)).limit(1);
      if (existing.length > 0) {
        await db.update(cmsSettingsTable).set({ value, updatedAt: new Date() }).where(eq(cmsSettingsTable.key, key));
      } else {
        await db.insert(cmsSettingsTable).values({ key, value });
      }
    }
    const settings = await getSettings();
    return res.json(settings);
  } catch {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

export default router;
