var EXPORTED_SYMBOLS = ["tbsf_sort_functions", "getFolderFromUri"]
var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

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
