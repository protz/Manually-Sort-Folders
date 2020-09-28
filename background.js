messenger.WindowListener.registerDefaultPrefs("defaults/preferences/prefs.js");

messenger.WindowListener.registerChromeUrl([ 
  ["content",  "tbsortfolders",          "content/"],
  ["resource", "tbsortfolders",          "modules/"],
  ["locale",   "tbsortfolders", "da",    "locale/da/"],
  ["locale",   "tbsortfolders", "de",    "locale/de/"],
  ["locale",   "tbsortfolders", "en-US", "locale/en-US/"],
  ["locale",   "tbsortfolders", "es-ES", "locale/es-ES/"],
  ["locale",   "tbsortfolders", "fr",    "locale/fr/"],
  ["locale",   "tbsortfolders", "it",    "locale/it/"],
  ["locale",   "tbsortfolders", "ja",    "locale/ja/"],
  ["locale",   "tbsortfolders", "nl",    "locale/nl/"],
  ["locale",   "tbsortfolders", "nb-NO", "locale/nb-NO/"],
  ["locale",   "tbsortfolders", "pl",    "locale/pl/"],
  ["locale",   "tbsortfolders", "pt",    "locale/pt/"],
  ["locale",   "tbsortfolders", "pt-BR", "locale/pt-BR/"],
  ["locale",   "tbsortfolders", "ru-RU", "locale/ru-RU/"],
  ["locale",   "tbsortfolders", "sk",    "locale/sk/"],
  ["locale",   "tbsortfolders", "sr",    "locale/sr/"],
  ["locale",   "tbsortfolders", "sv-SE", "locale/sv-SE/"],
  ["locale",   "tbsortfolders", "zh-CN", "locale/zh-CN/"],
  ["locale",   "tbsortfolders", "zh-TW", "locale/zh-TW/"],
]);

// For Thunderbird 78.0 and later
messenger.WindowListener.registerWindow(
  "chrome://messenger/content/messenger.xhtml",
  "chrome://tbsortfolders/content/scripts/messenger.js");

// For Thunderbird 68
messenger.WindowListener.registerWindow(
  "chrome://messenger/content/messenger.xul",
  "chrome://tbsortfolders/content/scripts/messenger.js");

messenger.WindowListener.startListening();
