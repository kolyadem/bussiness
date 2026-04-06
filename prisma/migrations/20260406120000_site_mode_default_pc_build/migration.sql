-- Default site experience: PC build / configurator-first. Existing rows move to PC_BUILD unless already set.

ALTER TABLE "SiteSettings" ALTER COLUMN "siteMode" SET DEFAULT 'PC_BUILD';

UPDATE "SiteSettings" SET "siteMode" = 'PC_BUILD' WHERE "siteMode" = 'STORE';
