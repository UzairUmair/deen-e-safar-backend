# Academy source and review policy

Authenticity takes priority over a complete-sounding story. The catalog is
editorial planning, not expert approval or a licensed historical corpus. Full
biographies, dates, dialogue, battles and disputed reports must not be generated
from model memory. Passage studies explicitly cannot establish a full chronology.

Evidence types stay distinct: Quran, Hadith, Tafsir, Seerah, history and scholarly
opinion. SourcePassage supports these labels plus title, author and topicTags.
Non-Quran/Hadith proposals require title, author and authenticity/context note;
Quran/Hadith keep trusted catalog ID checks. Languages are separate attributed
passages. Exact bundled Arabic and English/Urdu translations are displayed;
Roman Urdu teaching does not manufacture a sacred-text translation.

## Review workflow

1. Acquire permitted editions and record author, reference, language, publisher,
   edition and authenticity/uncertainty. Do not infer republication rights.
2. Existing admin/CLI ingestion defaults new/changed passages to pending with
   unverified licensing. Content hashes include added provenance metadata.
3. A qualified human reviews text and historical context; a responsible human
   checks licensing, attribution and permitted use. Existing admin review binds
   approval to the current contentHash and verified administrator identity.
4. Approved licensing, named license, attribution and rights URL are required
   before source approval. Imports/AI text cannot approve themselves. This feature
   does not approve any production source.
5. Map stable source IDs after reviewing the lesson outline. Missing coverage
   withholds generation, even if another unrelated passage is approved.
6. Evaluate explanations with qualified reviewers before enabling broader history.
   Revocation excludes cached explanations and quiz scoring too.

Existing Quran/Hadith publisher restrictions remain. Historical proposals also
accept OpenITI's official site and its own GitHub/raw GitHub namespace, always
pending content and license review. Other publishers need a reviewed policy
change. Supporting historical metadata does not make a corpus approved. Source
assignments to lesson/step pairs are hashed and reviewed with the passage; edits
invalidate prior approval. See ai-academy-content-review.md and the source research
register for the acquisition path. No automatic approval pipeline is introduced.

No fictional quotations/conversations, private thoughts, unsupported dates,
supernatural details or scenes. Military history stays educational and non-graphic,
without tactical or weapon-use instructions. Acknowledge supported differences;
no personal fatwas, sectarian hostility or qualification claims. Open answers get
formative feedback, not deterministic grades. Objective quizzes need one supported
answer. Neither JSON validity nor citation membership establishes historical truth.

A scholar-reviewed licensed Seerah/Sahaba/history corpus and expert evaluation set
were not supplied. Source gates remain closed where coverage is absent. The local
harness uses explicitly labelled TEST approvals only in a guarded demo emulator
and temporary MongoDB. Those approvals/mock answers never reach production.
