var tbsf_prefs = Application.extensions.get("tbsortfolders@xulforum.org").prefs;
var tbsf_prefs_functions; //the functions we want (obtained from the preferences)

var tbsf_sort_functions = [
  //Thunderbird's default
  function(a, b) {
    let sortKey = a._folder.compareSortKeys(b._folder);
    if (sortKey)
      return sortKey;
    return a.text.toLowerCase() > b.text.toLowerCase();
  },

  //Alphabetical
  function(a, b) {
    return a.text.toLowerCase() > b.text.toLowerCase();
  },

  //Custom
  function (data, a, b) {
    /* If a folder was added and we don't have a custom key for it, we just put
     * it at the end. Such folders are sorted with "alphabetical" sort function */
    let k1 = a._folder.folderURL;
    let k2 = b._folder.folderURL;
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
  while (parent.parent) parent = parent.parent;
  let parentName = parent.prettiestName;

  let sort_function;
  if (tbsf_prefs_functions[parentName]) {
    //We have a value for this account (tbsf_prefs_functions contains the right
    //sort functions)
    sort_function = tbsf_prefs_functions[parentName];
  } else {
    //We don't: use Tb's default
    sort_function = tbsf_sort_functions[0];
  }
  aFtvItems.sort(sort_function);
}

function update_prefs_functions() {
  let tbsf_data = JSON.parse(tbsf_prefs.getValue("tbsf_data", JSON.stringify(Object ())));
  tbsf_prefs_functions = Object();
  for (vkey in tbsf_data) {
    let key = vkey;
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
