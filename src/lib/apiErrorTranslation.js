/**
 * Backend error messages (`response.data.message`) come straight from the
 * API in English — there's no i18n layer on that side. Small hand-maintained
 * dictionary for the messages actually seen in this app, same approach as
 * tagNameTranslation.js. Unknown messages pass through untranslated rather
 * than being guessed at.
 */
const EXACT_TRANSLATIONS = {
  "insufficient permissions": "Недостаточно прав",
};

/** Returns the Russian translation for a known backend error message, or the original message unchanged if it's not in the dictionary. */
export function translateApiError(message) {
  if (!message || typeof message !== "string") return message;
  const translated = EXACT_TRANSLATIONS[message.trim().toLowerCase()];
  return translated || message;
}
