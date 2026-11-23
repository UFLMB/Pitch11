const HEADER_ALIASES = {
  name: ["name", "player", "playername", "fullname"],
  number: ["number", "jersey", "jerseynumber", "shirtnumber", "no"]
};

function parseCsvRows(source) {
  const text = String(source || "").replace(/^\uFEFF/, "");
  const firstLine = text.split(/\r?\n/, 1)[0] || "";
  const delimiters = [",", ";", "\t"];
  const delimiter = delimiters.sort((a, b) =>
    firstLine.split(b).length - firstLine.split(a).length
  )[0];
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && char === delimiter) {
      row.push(field.trim()); field = "";
    } else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field.trim()); field = "";
      if (row.some(value => value !== "")) rows.push(row);
      row = [];
    } else field += char;
  }
  row.push(field.trim());
  if (row.some(value => value !== "")) rows.push(row);
  return rows;
}

function normalizeHeader(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function parseTeamRosterCsv(source) {
  const rows = parseCsvRows(source);
  if (!rows.length) throw new Error("The CSV file is empty.");
  const headers = rows[0].map(normalizeHeader);
  const nameIndex = headers.findIndex(value => HEADER_ALIASES.name.includes(value));
  const numberIndex = headers.findIndex(value => HEADER_ALIASES.number.includes(value));
  let start = 1, nameColumn = nameIndex, numberColumn = numberIndex;
  if (nameColumn < 0 || numberColumn < 0) {
    if (rows[0].length < 2) throw new Error("CSV needs Name and Number columns.");
    nameColumn = 0; numberColumn = 1; start = 0;
  }
  const roster = [];
  const seenNumbers = new Set();
  for (let i = start; i < rows.length; i++) {
    const name = String(rows[i][nameColumn] || "").trim().replace(/\s+/g, " ");
    const rawNumber = String(rows[i][numberColumn] || "").trim();
    if (!name && !rawNumber) continue;
    if (!name) throw new Error("Missing player name on CSV row " + (i + 1) + ".");
    if (!/^\d{1,2}$/.test(rawNumber)) throw new Error("Invalid shirt number for " + name + " on CSV row " + (i + 1) + ".");
    const number = Number(rawNumber);
    if (number < 0 || number > 99) throw new Error("Shirt number must be between 0 and 99 for " + name + ".");
    if (seenNumbers.has(number)) throw new Error("Duplicate shirt number: " + number + ".");
    seenNumbers.add(number);
    roster.push({ name, number: String(number).padStart(2, "0") });
  }
  if (!roster.length) throw new Error("No valid players were found in the CSV.");
  if (roster.length > 60) throw new Error("A squad can contain at most 60 players per export.");
  return roster;
}

export function resolveKitGraphicText(item, player) {
  if (item?.kind === "player-name") return String(player?.name || item.text || "");
  if (item?.kind === "number") return String(player?.number ?? item.text ?? "");
  return String(item?.text || "");
}

function crc32(bytes) {
  let crc = -1;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ -1) >>> 0;
}

function dosDateTime(date) {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  };
}

export function createStoredZip(entries) {
  const encoder = new TextEncoder();
  const localParts = [], centralParts = [];
  let offset = 0;
  const stamp = dosDateTime(new Date());
  for (const entry of entries) {
    const name = encoder.encode(String(entry.name).replace(/\\/g, "/"));
    const data = typeof entry.data === "string" ? encoder.encode(entry.data) : entry.data;
    if (!(data instanceof Uint8Array)) throw new Error("ZIP entry data must be text or Uint8Array.");
    if (name.length > 65535 || data.length > 0xffffffff || offset > 0xffffffff) throw new Error("The generated texture pack is too large for ZIP32.");
    const crc = crc32(data);
    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 0, true); lv.setUint16(10, stamp.time, true); lv.setUint16(12, stamp.date, true);
    lv.setUint32(14, crc, true); lv.setUint32(18, data.length, true); lv.setUint32(22, data.length, true);
    lv.setUint16(26, name.length, true); lv.setUint16(28, 0, true); local.set(name, 30);
    localParts.push(local, data);
    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true); cv.setUint16(10, 0, true); cv.setUint16(12, stamp.time, true);
    cv.setUint16(14, stamp.date, true); cv.setUint32(16, crc, true); cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true); cv.setUint16(28, name.length, true); cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true); cv.setUint16(34, 0, true); cv.setUint32(36, 0, true);
    cv.setUint32(42, offset, true); central.set(name, 46); centralParts.push(central);
    offset += local.length + data.length;
  }
  if (entries.length > 65535) throw new Error("Too many files for ZIP32.");
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22), ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, entries.length, true); ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true); ev.setUint32(16, offset, true);
  return new Blob([...localParts, ...centralParts, end], { type: "application/zip" });
}
