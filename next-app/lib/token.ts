export const TOKEN_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateToken(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    if (i === 3) code += "-";
    code += TOKEN_CHARS[Math.floor(Math.random() * TOKEN_CHARS.length)];
  }
  return code;
}
