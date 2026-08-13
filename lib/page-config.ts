import { NAVIGATION_ITEMS } from "@/permissions/navigation-policy";

export function getPageConfig(href: string) {
  const item = NAVIGATION_ITEMS.find((candidate) => candidate.href === href);
  if (!item) {
    throw new Error(`Missing page configuration for ${href}`);
  }
  return item;
}
