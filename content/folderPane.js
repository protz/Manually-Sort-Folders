(function () {
  /* For folder sorting */

  const Cc = Components.classes;
  const Ci = Components.interfaces;
  const Cu = Components.utils;
  Cu.import("resource://tbsortfolders/sort.jsm");
  /* Cu.import("resource://gre/modules/folderUtils.jsm"); */

  const tbsf_prefs = Application.extensions.get("tbsortfolders@xulforum.org").prefs;
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
    let tbsf_data = JSON.parse(tbsf_prefs.getValue("tbsf_data", JSON.stringify(Object ())));
    tbsf_prefs_functions = Object();
    for (vkey in tbsf_data) {
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
  tbsf_prefs.get("tbsf_data").events.addListener("change", update_prefs_functions);

  /* For default startup folder */
  let oldLoad = gFolderTreeView.load;
  let firstRun = true;

  gFolderTreeView.load = function (aTree, aJSONFile) {
    oldLoad.call(this, aTree, aJSONFile);
    if (!firstRun)
      return;

    let startup_folder = tbsf_prefs.getValue("startup_folder", "");
    if (startup_folder != "") {
      let folder = getFolderFromUri(startup_folder);
      if (folder) {
        dump("FOUND\n");
        document.addEventListener("load", function() gFolderTreeView.selectFolder(folder, true), true);
      }
    }
    firstRun = false;
  };
})()
