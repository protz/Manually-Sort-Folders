const PREF_PREFIX = "extensions.tbsortfolders@xulforum.org.";
// They were all defined as strings.
const PREF_DEFAULTS = {
  "tbsf_data": "{}",
  "startup_folder": "",
  "defaultaccount": "",
  "width": "0",
  "height": "0",
  "hide_folder_icons": "",
}

browser.runtime.onStartup.addListener(async () => {
  let preferences = await browser.storage.local.get({
    startupFolder: ""
  })
  if (preferences.startupFolder) {
    // Extract accountId and path.
    let data = preferences.startupFolder.split(":");
    let accountId = data.shift();
    let path = data.join(":");

    let mailTabs = await browser.mailTabs.query({});
    for (let mailTab of mailTabs) {
      browser.mailTabs.update(mailTab.id, {displayedFolder: {accountId, path}});
    }
  }
})

async function init() {
  // TODO: Migrate old LegacyPrefs to local storage.
  let prefs = {};
  for (let [name, value] of Object.entries(PREF_DEFAULTS)) {
    await browser.LegacyPrefs.setDefaultPref(`${PREF_PREFIX}${name}`, value);
    prefs[name] = await browser.LegacyPrefs.getPref(`${PREF_PREFIX}${name}`);
  }

  browser.tabs.onCreated.addListener(async tab => {
    let preferences = await browser.storage.local.get({
      accountSettings: new Map(), 
      folderSort: new Map()
    })
    browser.CustomFolderSort.patch(tab.id, preferences);
  });

  // Handle all already open tabs.
  async function handlerAlreadyOpenTabs() {
    let tabs = (await browser.tabs.query({})).filter(t => ["mail"].includes(t.type));
    let preferences = await browser.storage.local.get({
      accountSettings: new Map(), 
      folderSort: new Map()
    })
    for (let tab of tabs) {
      browser.CustomFolderSort.patch(tab.id, preferences);
    }
  }
  handlerAlreadyOpenTabs();
}
init();

