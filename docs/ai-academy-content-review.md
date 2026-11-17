# Adding reviewed content without rebuilding the tutor

The source workflow now carries lesson assignments inside SourcePassage metadata.
The deployed lesson IDs and three-step outlines remain stable. Adding or changing
passages for these existing lessons does not require rebuilding the tutor or
frontend. Creating new course outlines is a separate catalog change.

## Administrator workflow

1. Sign in as a verified Firebase administrator. In Account → Content review,
   expand “Propose or update a source passage”. Paste a complete source object,
   including the exact permitted text and provenance. The existing ingestion CLI
   accepts the same schema. No server-side URL fetch or automatic book download
   occurs; sourceURL is attribution metadata.
2. Include `academyScopes`, an array of `{lessonId, stepId}` assignments. For
   example, the existing Abu Bakr outline is `academy:abu-bakr`; its step IDs are
   `0`, `1`, `2`. Select only steps that the actual passage supports. Source IDs
   remain stable and start with their evidence type. References must identify the
   exact edition location, not just a book title.
3. Save the proposal. New text, changed provenance or changed assignments become
   pending with unverified licensing. Unchanged resubmissions remain idempotent.
   The pending queue displays title/author, edition, authenticity and assignments.
4. A responsible human reviews rights and content, enters license name, rights
   URL, attribution and a review note, then approves the current hash. Approval
   records the administrator identity; it is an attestation, not automatic proof
   that the administrator is a qualified scholar. Arrange qualified review outside
   the software and record its basis in the review note.
5. Reload the lesson. Public lesson details expose only eligible approved passages
   for that exact lesson/step. The frontend displays them alongside bundled source
   reading. Tutor requests retrieve these live mappings and validated citations.

The source-publisher allowlist now permits OpenITI's official site and its own
GitHub/raw GitHub namespace as historical **proposal** origins. Existing Quran/
Hadith publisher restrictions remain. This does not approve OpenITI licensing or
any report. Other publishers require a reviewed policy change; never use a
misleading allowed-domain link to hide the real publisher.

## Security and revocation

Proposal and approval endpoints require trusted Firebase admin claims, not a
browser role field. Proposed JSON cannot include approval/license/admin fields.
Assignments are validated against real lesson/step IDs and included in the content
hash. A stale approval hash fails with409. Metadata/text edits reset both review
and licensing. Scoped lookup uses one matching lesson/step pair, preventing a
passage assigned to lesson A/step0 and lesson B/step1 leaking into A/step1.

Live review, source hashes, evidence budgets and citation validation still apply.
Revoked content is excluded from cached tutor responses and quiz scoring. Source
cards show evidence type and provenance; they do not say “scholar-verified” merely
because data was imported. Missing mappings return an honest review limitation.

For source-mapped Quran/Hadith reading guides, the existing required references
must still be covered. Additional approved historical material supplements them.
For empty historical outlines, approved scoped passages can supply coverage.
This enables later content acquisition while retaining the current guardrails.
