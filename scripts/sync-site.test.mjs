import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { alreadyCopiedByReview, prNumberFromSubject, subjectLine, syncDecision } from "./sync-site.mjs";

describe("site sync", () => {
  it("skips the commit Apply review already copied", () => {
    assert.equal(
      alreadyCopiedByReview("chore: approve field card refresh (#10)\n\nApproved from Slack."),
      true,
    );
    assert.equal(alreadyCopiedByReview("Restyle the delivery card toward the control-room picture"), false);
  });

  it("reads a pull request number from the subject", () => {
    assert.equal(subjectLine("Title (#9)\n\nbody"), "Title (#9)");
    assert.equal(prNumberFromSubject("Make the plates the same size (#9)"), "9");
    assert.equal(prNumberFromSubject("no number here"), "");
  });

  it("falls back when the site does not know the sync token yet", () => {
    assert.equal(syncDecision(200, '{"ok":true,"action":"sync"}'), "ok");
    assert.equal(syncDecision(400, "This approve/skip link is invalid payload"), "fallback");
    assert.equal(syncDecision(400, "invalid_payload"), "fallback");
    assert.equal(syncDecision(500, "site sync failed"), "fail");
  });
});
