// Random code generator using crypto.getRandomValues
export function randomCode(len: number): string {
  const c = "abcdefghijklmnopqrstuvwxyz0123456789";
  let r = "";
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const arr = new Uint8Array(len);
    window.crypto.getRandomValues(arr);
    for (let i = 0; i < len; i++) r += c[arr[i] % c.length];
  } else {
    for (let i = 0; i < len; i++) r += c[Math.floor(Math.random() * c.length)];
  }
  return r;
}

// Vote button CSS class
export function voteBtnCls(opt: string, type: string): string {
  if (type === "yes-no") {
    if (opt === "Ja") return "ja";
    if (opt === "Nein") return "nein";
    return "enthaltung";
  }
  return "custom";
}

// Bar CSS class
export function barCls(opt: string, type: string): string {
  if (type === "yes-no") {
    if (opt === "Ja") return "ja";
    if (opt === "Nein") return "nein";
    return "enthaltung";
  }
  return "custom";
}

// Format timer time
export function formatTimerTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
}
