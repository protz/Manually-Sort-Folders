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
    let k1 = a._folder.folderURL;
    let k2 = b._folder.folderURL;
    if (!data[k1] && data[k2]) {
      dump("!");
      return 1;
    } else if (data[k1] && !data[k2]) {
      dump("!");
      return -1;
    } else if (!data[k1] && !data[k2]) {
      dump("!");
      return (a.text.toLowerCase() > b.text.toLowerCase())*2 - 1;
    } else {
      //dump(".");
      //dump(data[k2]+" "+data[k1]+"\n");
      return data[k1] - data[k2];
    }
  }
]

function sortFolderItems (aFtvItems) {
  if (!aFtvItems.length)
    return;
  
  let parent = aFtvItems[0]._folder.parent;
  while (parent.parent) parent = parent.parent;
  let parentName = parent.prettiestName;
  //dump("###"+parentName+"\n");

  let sort_function;
  if (tbsf_prefs_functions[parentName]) {
    sort_function = tbsf_prefs_functions[parentName];
  } else {
    sort_function = tbsf_sort_functions[0];
  }
  aFtvItems.sort(sort_function);
}

var tbsf_prefs = Application.extensions.get("tbsortfolders@xulforum.org").prefs;
if (!tbsf_prefs.get("tbsf_data")) tbsf_prefs.setValue("tbsf_data", JSON.stringify(Object ()));

var tbsf_prefs_functions;

function update_prefs_functions() {
  let tbsf_data = JSON.parse(tbsf_prefs.getValue("tbsf_data", JSON.stringify(Object ())));
  tbsf_prefs_functions = Object();
  for (key in tbsf_data) {
    if (tbsf_data[key][0] == 2) {
      tbsf_prefs_functions[key] = function (a,b) tbsf_sort_functions[2](tbsf_data[key][1], a, b);
    } else {
      tbsf_prefs_functions[key] = tbsf_sort_functions[tbsf_data[key][0]];
    }
  }
}

update_prefs_functions();
tbsf_prefs.get("tbsf_data").events.addListener("change", update_prefs_functions);
