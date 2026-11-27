export function generatePassword(length = 24) {
  if (!Number.isSafeInteger(length) || length < 12 || length > 128) throw new Error("Kies 12 tot 128 tekens.");
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ","abcdefghijkmnopqrstuvwxyz","23456789","!@#$%&*+-=?_"];
  const alphabet = sets.join("");
  function pick(n) {
    const bytes = new Uint8Array(1);
    const limit = 256 - 256 % n;
    do { crypto.getRandomValues(bytes); } while (bytes[0] >= limit);
    return bytes[0] % n;
  }
  const result = sets.map(set=>set[pick(set.length)]);
  while(result.length < length) result.push(alphabet[pick(alphabet.length)]);
  for(let i=result.length-1;i>0;i--){const j=pick(i+1);[result[i],result[j]]=[result[j],result[i]];}
  return result.join("");
}
