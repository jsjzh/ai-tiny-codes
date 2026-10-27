export function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent);
}

export function isMultiSelectModifier(event: {
  ctrlKey: boolean;
  metaKey: boolean;
}): boolean {
  return isMacPlatform() ? event.metaKey : event.ctrlKey;
}
