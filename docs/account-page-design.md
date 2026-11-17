# Personal account center

The existing Next.js hash router, Firebase identity, MongoDB User profile, account store and preferences components remain authoritative. The account center uses a cream/navy personal header with initials, real name/email, verification and creation date, a desktop section sidebar, mobile wrapping navigation and individual content cards.

AccountLearning loads all bookmark pages and academy sessions with identity-change cancellation. Counts are academy completions, distinct active academy tracks and saved references; no streak or achievement is inferred. Recent activity uses actual lastAccessedAt values. Quiz history is paginated and explicitly shows loading/empty/error states. These counts do not claim to include legacy lesson completions.

Profile name validation, backend synchronization, guest import consent, verification, Google linking, reset-password and logout reuse existing actions. Deletion uses a native modal dialog and existing recent-auth backend/Firebase deletion workflow; cancellation never deletes records. The UI awaits the full action before reporting success. No UID/token is displayed. Initials are used; image upload is not supported by the current profile contract.

Saved Quran, dua, hadith and academy lessons have search/category/remove/open controls. Lesson bookmarks extend the existing owner-scoped Bookmark model. Hadith links now select their original detail. Guest saved-content behavior remains in the existing bookmark/library screens; Account still requires authentication.

Quran and prayer controls reuse Preferences/QuranSettings/PrayerSettings/LocationPicker. Learning defaults add validated language, difficulty, reading size and source visibility to User.preferences; partial updates merge without losing other fields. Preference writes retain the existing sync banner and conflict handling.
