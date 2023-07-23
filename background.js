browser.WindowListener.registerDefaultPrefs("defaults/preferences/prefs.js");


// For Thunderbird 78.0 and later
browser.WindowListener.registerWindow(
  "chrome://messenger/content/messenger.xhtml",
  "chrome://tbsortfolders/content/scripts/messenger.js");

// For Thunderbird 68
browser.WindowListener.registerWindow(
  "chrome://messenger/content/messenger.xul",
  "chrome://tbsortfolders/content/scripts/messenger.js");

browser.WindowListener.startListening();
