
(async function () {
  /* For folder sorting */

  const Cc = Components.classes;
  const Ci = Components.interfaces;
  const Cu = Components.utils;

  Cu.import("resource://gre/modules/Log.jsm");
  let tblog = Log.repository.getLogger("tbsortfolders.folderPane");
  tblog.level = Log.Level.Debug;
  tblog.addAppender(new Log.ConsoleAppender(new Log.BasicFormatter()));
  tblog.addAppender(new Log.DumpAppender(new Log.BasicFormatter()));

  var Services = globalThis.Services || ChromeUtils.import(
    "resource://gre/modules/Services.jsm"
  ).Services;

  Cu.import("resource://tbsortfolders/sort.jsm");
  Cu.import("resource:///modules/MailUtils.jsm");

  const ThunderbirdMajorVersion = Services.appinfo.version.split(".")[0];

  tblog.debug("Init");

  const tbsf_prefs = Services.prefs.getBranch("extensions.tbsortfolders@xulforum.org.");
  /* This array is populated either when the file is loaded or when the
   * preferences are updated. The keys are the account's pretty names and the
   * values are the sort functions associated to each account. */
  var tbsf_prefs_functions;
  const mail_accountmanager_prefs = Services.prefs.getBranch("mail.accountmanager.");
  {
    let accounts = mail_accountmanager_prefs.getStringPref("accounts").split(",");
    tblog.debug("Accounts: "+accounts);
  }

//   var tb_accounts = mail_accountmanager_prefs.getStringPref("accounts");
//   var tb_default_account = mail_accountmanager_prefs.getStringPref("defaultaccount");
//   tblog.debug("TB Accounts: "+tb_accounts);
//   tblog.debug("TB Default account: "+tb_default_account);

//   let tbsf_accounts = null;
//   let tbsf_default_account = null;
//   try {
//     tbsf_accounts = tbsf_prefs.getStringPref("accounts");
//     tbsf_default_account = tbsf_prefs.getStringPref("defaultaccount");
//     tblog.debug("TBSF Accounts: "+tbsf_accounts);
//     tblog.debug("TBSF Default account: "+tbsf_default_account);
//   } catch (x) {
//   }

  tblog.debug("Add observer");

  let mainWindow = Services.wm.getMostRecentWindow("mail:3pane");  
  let config = {attributes:true,attributeFilter:["maxpos"],childList:true,subtree:true};
  var callback_foldertree =  function (mutationList, observer) {
    tblog.debug("Observer activated");

//    for (let mutation of mutationList) {
//      if (mutation.type == 'childList') {
//        tblog.debug("Childnode added");
//      } else if (mutation.type == 'attributes') {
//        tblog.debug("The "+mutation.attributeName+" attribute changed");
//      }
//    }

    let current_default_account = mail_accountmanager_prefs.getStringPref("defaultaccount");
    let tbsf_default_account = tbsf_prefs.getStringPref("defaultaccount");
//    tblog.debug("Current Default account: "+current_default_account);
//    tblog.debug("Stored Default account: "+tbsf_default_account);

    if (tbsf_default_account && current_default_account !== tbsf_default_account)
      mail_accountmanager_prefs.setStringPref("defaultaccount", tbsf_default_account);

/*
    let current_tb_accounts = mail_accountmanager_prefs.getStringPref("accounts");
    let tbsf_accounts = null;
    try {
      tbsf_accounts = tbsf_prefs.getStringPref("accounts");
    } catch (x) {
    }
    tblog.debug("Current accounts: "+current_tb_accounts);
    tblog.debug("Stored accounts: "+tbsf_accounts);
*/
  };
  var observer_foldertree = new MutationObserver(callback_foldertree);
  observer_foldertree.observe(mainWindow.document.getElementById('folderTree'),config);

//  observer_foldertree.disconnect();

  // Override function sortFolderItems(aFtvItems) of TB (in comm/mail/base/content/folderPane.js)
  sortFolderItems = function (aFtvItems) {
    if (!aFtvItems.length)
      return;

    //A sort function is associated to every account, so we get the account's name
    let parent = aFtvItems[0]._folder.parent;
    //In case we're asked to sort sub-folders, we walk up the tree up to the root
    //item which is the "fake folder" representing the account.
    while (parent.parent) parent = parent.parent;
    let parentName = parent.prettyName;

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
    let tbsf_data = {};
    try {
      tbsf_data = JSON.parse(tbsf_prefs.getStringPref("tbsf_data"));
    } catch (e) {
    }
    tbsf_prefs_functions = Object();
    for (let vkey in tbsf_data) {
      let key = vkey;
      /* key[0] = 0 if the user asked for Tb's default sort function, 1 for
          alphabetical, 2 for custom sort
         key[1] = the data to pass to tbsf_sort_functions[2] if key[0] == 2
      */
      if (tbsf_data[key][0] == 2) {
        //feed the manual sort function with the associated sort data
        tbsf_prefs_functions[key] = (a,b) => tbsf_sort_functions[2](tbsf_data[key][1], a, b);
      } else {
        //other functions don't need specific data
        tbsf_prefs_functions[key] = tbsf_sort_functions[tbsf_data[key][0]];
      }
    }
  }

  update_prefs_functions();

  let myPrefObserver = {
    register: function mpo_register () {
      tbsf_prefs.QueryInterface(Components.interfaces.nsIPrefBranch);
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

  /* Startup folder */
  let startup_folder = tbsf_prefs.getStringPref("startup_folder");
  if (startup_folder) {
    tblog.debug("startup folder: "+startup_folder);
  } else {
    tblog.debug("No startup folder specified");
  }

  if (startup_folder && ThunderbirdMajorVersion < 98) {
    /*
      On Thunderbird 97 and earlier, it was possible for add-ons to intervene in
      the startup behavior of Thunderbird.
    */
    const oldRestoreTab = mailTabType.modes.folder.restoreTab;
    let inRestoreTab = false;
    mailTabType.modes.folder.restoreTab = function (x, y) {
      tblog.debug("restoreTab");
      inRestoreTab = true;
      oldRestoreTab.call(this, x, y);
      inRestoreTab = false;
    };
    const oldSelectFolder = gFolderTreeView.selectFolder;
    const change_folder = startup_folder;
    let firstRun = true;
    gFolderTreeView.selectFolder = function (x, y) {
      tblog.debug("selectFolder firstRun:"+firstRun.toString()+" inRestoreTab:"+inRestoreTab.toString());
      if (firstRun && inRestoreTab) {
        const folder = MailUtils.getExistingFolder(change_folder);
        if (folder) {
          oldSelectFolder.call(this, folder, true);
          /* Ensures that the selected folder is on the screen. */
          const selected = gFolderTreeView.getSelectedFolders()[0];
          if (selected) {
            gFolderTreeView._treeElement.ensureRowIsVisible(gFolderTreeView.getIndexOfFolder(selected));
          }
        } else {
          oldSelectFolder.call(this, x, y);
        }
        firstRun = false;
      } else {
        oldSelectFolder.call(this, x, y);
      }
    }
    tblog.debug("Overriding selectFolder");
    startup_folder = null;
  }

  /*
    Refresh pane and select folder

    The start of this add-on may be too early to call gFolderTreeView._rebuild()
    and MailUtils.getExistingFolder().

    So I structured a 10-times retry loop to counter any exceptions or failures
    that may occur due to that.
  */
  async function selectFolder(win, startup_folder) {
    let tries = 0;
    let ms = 100;

    // Stop after 10 tries. Or use other break condition, like total time spend.
    while (tries < 10) {
      try {
        /*
          Refresh pane -- possible exception.
        */
        win.gFolderTreeView._rebuild();
        if (startup_folder) {
          /*
            Select folder
            Since Thunderbird 98, add-on startup has been delayed until
            Thunderbird is mostly done. So there is no way other than
            immediately selecting the folder. However, there is a report of a
            case where getExistingFolder returns null for the existing folder.
          */
          let folder = MailUtils.getExistingFolder(startup_folder);
          if (folder && gFolderTreeView.selectFolder(folder, true)) {
            return true;
          }
        } else {
          return true;
        }
      } catch (e) {
        // Nothing.
      }
      tries++;
      await new Promise(resolve => setTimeout(resolve, ms));
    }
    return false;
  }

  let selectPromises = [];
  for (let win of Services.wm.getEnumerator("mail:3pane")) {
    selectPromises.push(selectFolder(win, startup_folder));
  }

  let results = await Promise.all(selectPromises);
  tblog.debug("Refreshing the pane"
              + (startup_folder ? " and selecting folder" : "")
              + ": "
              + (results ? "Success" : "Failure"));

  /* Ensures that the selected folder is on the screen. */
  {
    const selected = gFolderTreeView.getSelectedFolders()[0];
    if (selected) {
      gFolderTreeView._treeElement.ensureRowIsVisible(gFolderTreeView.getIndexOfFolder(selected));
    }
  }

  tblog.debug("Init done");

})()
