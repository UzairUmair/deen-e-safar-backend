# Source-grounded assistant policy

Approved AND license-approved SourcePassage records are the only evidence for substantive answers. Quran/Hadith/tafsir/seerah/history/scholarly-opinion remain distinct types. Citation IDs, Quran references and supplied-source membership are validated; approval/content hashes are checked again after generation. Exact retrieved excerpts and attribution are shown separately from generated explanations.

Retrieval is bounded lexical ranking with bilingual aliases and recent topic context, not vector semantic search. Language preference is a small ranking factor. Source metadata retains authenticity/edition/attribution; an approved record does not imply every historical account is universally authentic. No unreviewed historical dataset is imported or approved.

User/context/evidence are data, never system instructions. The model is instructed to use evidence only, structure explanations, acknowledge missing facts, avoid invented dates/dialogue/sacred text, and avoid combat tactics or personal fatwas. Exact Quran Arabic belongs in retrieved source cards. Structural citation checks cannot prove semantic entailment or religious correctness. Qualified source and claim review is still required.

Public guests can browse, search bundled texts and exchange narrow greetings. Religious/history generation retains verified Firebase authentication and durable quota policy. Source search is separately labelled. Local ephemeral chat context stays in tab memory; save-history consent uses the existing Mongo models. Academy links open the existing reviewed curriculum/session engine and do not copy assistant chat records into lesson records.

Model selection remains GROQ_MODEL. Official Groq docs checked 17 November 2026 list openai/gpt-oss-120b and openai/gpt-oss-20b as production models; strict json_schema requires compatible models. See https://console.groq.com/docs/models and https://console.groq.com/docs/structured-outputs . The live smoke used configurable openai/gpt-oss-120b and strict schema output. No browser secret or hardcoded production model is introduced.
