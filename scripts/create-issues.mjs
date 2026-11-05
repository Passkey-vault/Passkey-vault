#!/usr/bin/env node
// Create the initial issue backlog (scripts/issues.json) on GitHub.
//
//   node scripts/create-issues.mjs            # dry run: list what would be created
//   node scripts/create-issues.mjs --apply    # create labels and issues with `gh`
//
// Issues whose exact title already exists are skipped, so it's safe to re-run.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const apply = process.argv.includes("--apply");
const REPO = "Passkey-vault/Passkey-vault";
const raw = JSON.parse(readFileSync(new URL("./issues.json", import.meta.url), "utf8"));
const gh = (...args) => execFileSync("gh", args, { encoding: "utf8" });

// Embed the mockup of every design folder an issue mentions, so contributors
// can see what "done" looks like without leaving the issue.
const designRoot = new URL("../design/stitch/", import.meta.url);
const withDesigns = (body) => {
  const names = [...new Set(body.match(/passkeyvault_[a-z0-9_.]+[a-z0-9]/g) ?? [])].filter((n) =>
    existsSync(new URL(`${n}/screen.png`, designRoot)),
  );
  if (!names.length) return body;
  const imgs = names
    .map((n) => `<img src="https://raw.githubusercontent.com/${REPO}/main/design/stitch/${n}/screen.png" width="240" alt="${n}" />`)
    .join("\n");
  return `${body}\n\n<details open><summary>Design mockups</summary>\n\n${imgs}\n\n</details>`;
};
const issues = raw.map((i) => ({ ...i, body: withDesigns(i.body) }));

const LABEL_COLORS = {
  "good first issue": "7057ff",
  "area:contract": "f9a03f",
  "area:app": "00dce6",
  "area:docs": "c0c1ff",
  "area:cli": "5319e7",
  "area:infra": "bfdadc",
  "complexity:low": "c2e0c6",
  "complexity:medium": "fbca04",
  "complexity:high": "d93f0b",
  security: "b60205",
};

if (!apply) {
  for (const i of issues) console.log(`- ${i.title}  [${i.labels.join(", ")}]`);
  console.log(`\n${issues.length} issues. Re-run with --apply to create them.`);
  process.exit(0);
}

for (const [name, color] of Object.entries(LABEL_COLORS)) {
  gh("label", "create", name, "--color", color, "--force");
}

const existing = new Set(
  JSON.parse(gh("issue", "list", "--state", "all", "--limit", "500", "--json", "title")).map((i) => i.title),
);

for (const issue of issues) {
  if (existing.has(issue.title)) {
    console.log(`skip    ${issue.title}`);
    continue;
  }
  const url = gh("issue", "create", "--title", issue.title, "--body", issue.body, ...issue.labels.flatMap((l) => ["--label", l]));
  console.log(`created ${url.trim()}`);
}
