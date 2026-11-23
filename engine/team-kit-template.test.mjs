import test from "node:test";
import assert from "node:assert/strict";
import { parseTeamRosterCsv, resolveKitGraphicText, createStoredZip } from "./team-kit-template.mjs";

test("parses comma, semicolon and tab separated squad rosters", () => {
  for (const csv of [
    "Name,Number\nAlex Morgan,13\nSam Kerr,20",
    "Player;Jersey Number\nAlex Morgan;13\nSam Kerr;20",
    "name\tnumber\nAlex Morgan\t13\nSam Kerr\t20"
  ]) {
    assert.deepEqual(parseTeamRosterCsv(csv), [
      { name: "Alex Morgan", number: "13" },
      { name: "Sam Kerr", number: "20" }
    ]);
  }
});

test("supports quoted names and ignores empty roster rows", () => {
  assert.deepEqual(parseTeamRosterCsv('Name,Number\n"Doe, Alex",7\n,\n"Sam ""The Wall"" Kerr",1'), [
    { name: "Doe, Alex", number: "07" },
    { name: 'Sam "The Wall" Kerr', number: "01" }
  ]);
});

test("rejects missing names, invalid and duplicate shirt numbers", () => {
  assert.throws(() => parseTeamRosterCsv("Name,Number\n,8"), /Missing player name/);
  assert.throws(() => parseTeamRosterCsv("Name,Number\nPlayer,100"), /between 0 and 99/);
  assert.throws(() => parseTeamRosterCsv("Name,Number\nPlayer A,8\nPlayer B,8"), /Duplicate shirt number/);
});

test("resolves player name and shirt number placeholders without changing static graphics", () => {
  const player = { name: "Alex Morgan", number: "13" };
  assert.equal(resolveKitGraphicText({ kind: "player-name", text: "PLAYER NAME" }, player), "Alex Morgan");
  assert.equal(resolveKitGraphicText({ kind: "number", text: "00" }, player), "13");
  assert.equal(resolveKitGraphicText({ kind: "sponsor", text: "PITCH 11" }, player), "PITCH 11");
});

test("creates a valid uncompressed ZIP with a central directory", async () => {
  const blob = createStoredZip([{ name: "team/hello.txt", data: "PITCH 11" }]);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const view = new DataView(bytes.buffer);
  assert.equal(view.getUint32(0, true), 0x04034b50);
  assert.equal(view.getUint32(bytes.length - 22, true), 0x06054b50);
  assert.ok([...bytes].some((value, index) => value === 0x50 && bytes[index + 1] === 0x4b && bytes[index + 2] === 0x01 && bytes[index + 3] === 0x02));
});
