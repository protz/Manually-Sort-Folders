(function () {
  /* For folder sorting */

  const Cc = Components.classes;
  const Ci = Components.interfaces;
  const Cu = Components.utils;
  Cu.import("resource://tbsortfolders/sort.jsm");
  Cu.import("resource://app/modules/MailUtils.js");

  const tbsf_prefs = Cc["@mozilla.org/preferences-service;1"]
    .getService(Ci.nsIPrefService)
    .getBranch("extensions.tbsortfolders@xulforum.org.");
  /* This array is populated either when the file is loaded or when the
   * preferences are updated. The keys are the account's prettiest names and the
   * values are the sort functions associated to each account. */
  var tbsf_prefs_functions;

  sortFolderItems = function (aFtvItems) {
    if (!aFtvItems.length)
      return;
    
    //A sort function is associated to every account, so we get the account's name
    let parent = aFtvItems[0]._folder.parent;
    //In case we're asked to sort sub-folders, we walk up the tree up to the root
    //item which is the "fake folder" representing the account.
    while (parent.parent) parent = parent.parent;
    let parentName = parent.prettiestName;

    let sort_function;
    if (tbsf_prefs_functions[parentName]) {
      //If we have a value for this account then tbsf_prefs_functions contains the
      //right sort function
      sort_function = tbsf_prefs_functions[parentName];
    } else {
      //If we don't: use Tb's default
      sort_function = tbsf_sort_functions[0];
    }
    aFtvItems.sort(sort_function);
  }

  function update_prefs_functions() {
    let tbsf_data = JSON.parse(tbsf_prefs.getCharPref("tbsf_data"));
    tbsf_prefs_functions = Object();
    for (let vkey in tbsf_data) {
      let key = vkey;
      /* key[0] = 0 if the user asked for Tb's default sort function, 1 for
          alphabetical, 2 for custom sort
         key[1] = the data to pass to tbsf_sort_functions[2] if key[0] == 2
      */
      if (tbsf_data[key][0] == 2) {
        //feed the manual sort function with the associated sort data
        tbsf_prefs_functions[key] = function (a,b) tbsf_sort_functions[2](tbsf_data[key][1], a, b);
      } else {
        //other functions don't need specific data
        tbsf_prefs_functions[key] = tbsf_sort_functions[tbsf_data[key][0]];
      }
    }
  }

  update_prefs_functions();

  let myPrefObserver = {
    register: function mpo_register () {
      tbsf_prefs.QueryInterface(Components.interfaces.nsIPrefBranch2);
      tbsf_prefs.addObserver("", this, false);
    },

    unregister: function mpo_unregister () {
      if (!tbsf_prefs) return;
        tbsf_prefs.removeObserver("", this);
    },

    observe: function mpo_observe (aSubject, aTopic, aData) {
      if (aTopic != "nsPref:changed")
        return;
      switch (aData) {
        case "tbsf_data":
          update_prefs_functions();
          break;
      }
    }
  };
  myPrefObserver.register();


  /* For default startup folder */
  let oldRestoreTab = mailTabType.modes.folder.restoreTab;
  let inRestoreTab = false;
  mailTabType.modes.folder.restoreTab = function (x, y) {
    inRestoreTab = true;
    oldRestoreTab.call(this, x, y);
    inRestoreTab = false;
  };
  let oldSelectFolder = gFolderTreeView.selectFolder;
  let firstRun = true;
  gFolderTreeView.selectFolder = function (x, y) {
    if (firstRun && inRestoreTab) {
      let startup_folder = tbsf_prefs.getCharPref("startup_folder");
      if (startup_folder != "") {
        let folder = MailUtils.getFolderForURI(startup_folder);
        if (folder)
          oldSelectFolder.call(this, folder, true);
        else
          oldSelectFolder.call(this, x, y);
      } else {
        oldSelectFolder.call(this, x, y);
      }
      firstRun = false;
    } else {
      oldSelectFolder.call(this, x, y);
    }
  };
})()
