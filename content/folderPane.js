var tbsf_prefs = Application.extensions.get("tbsortfolders@xulforum.org").prefs;
/* This array is populated either when the file is loaded or when the
 * preferences are updated. The keys are the account's prettiest names and the
 * values are the sort functions associated to each account. */
var tbsf_prefs_functions;

/* This array doesn't change, it just contains the stubs. The third function is
 * not complete, it is instanciated with the right data (i.e. the custom sort
 * keys) for each account before being added to tbsf_prefs_functions. */
var tbsf_sort_functions = [
  //Thunderbird's default (copied from the original folderPane.js)
  function(a, b) {
    let sortKey = a._folder.compareSortKeys(b._folder);
    if (sortKey)
      return sortKey;
    return a.text.toLowerCase() > b.text.toLowerCase();
  },

  //Strictly alphabetical
  function(a, b) {
    return a.text.toLowerCase() > b.text.toLowerCase();
  },

  //Custom
  function (data, a, b) {
    /* If a folder was added and we don't have a custom key for it, we just put
     * it at the end. Such folders are sorted with "alphabetical" sort function.
     * This is what all those four cases below are about. */
    let k1 = a._folder.URI;
    let k2 = b._folder.URI;
    //dump(k1+" "+k2+"\n");
    if (!data[k1] && data[k2])
      return 1;
    else if (data[k1] && !data[k2])
      return -1;
    else if (!data[k1] && !data[k2])
      return (a.text.toLowerCase() > b.text.toLowerCase())*2 - 1;
    else
      return data[k1] - data[k2];
  }
]

function sortFolderItems (aFtvItems) {
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
