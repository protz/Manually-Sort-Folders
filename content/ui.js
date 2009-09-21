var g_accounts = Object();

var tbsf_prefs = Application.extensions.get("tbsortfolders@xulforum.org").prefs;
var tbsf_data;

function on_load() {
  let json = tbsf_prefs.getValue("tbsf_data", JSON.stringify(Object()));
  tbsf_data = JSON.parse(json);

  let acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager);
  let accounts = acctMgr.accounts;
  let name;
  for (var i = 0; i < accounts.Count(); i++) {
    //fill the menulist with the right elements
    let account = accounts.QueryElementAt(i, Components.interfaces.nsIMsgAccount);
    name = account.incomingServer.rootFolder.prettiestName;
    let $it = $(document.createElement("menuitem")).attr("label", name);
    $("#accounts_menu").append($it);

    //register the account for future use, create the right data structure in
    //the data
    g_accounts[name] = account;
    if (!tbsf_data[name]) tbsf_data[name] = Array();
  }
  $("#accounts_menu").parent().attr("label", name);
  on_account_changed();
}

var current_account = null;

function fill_manual_sort(move_up, move_down) {
  if (!tbsf_data[current_account][1])
    tbsf_data[current_account][1] = {};

  $("#folders_list").empty();
  let account = g_accounts[current_account];
  let rootFolder = account.incomingServer.rootFolder; // nsIMsgFolder

  let sort_func = function(a,b) tbsf_sort_functions[2](tbsf_data[current_account][1], a, b);
  let walk;
  let i = 0;
  let generate = function(ftvItem, prefix) {
    let folder = ftvItem._folder;
    tbsf_data[current_account][1][folder.folderURL] = i;

    let name = prefix+folder.prettiestName;
    let $it = $(document.createElement("listitem")).attr("label", name);
    $it[0].value = folder.folderURL;
    $("#folders_list").append($it);
    if (folder.hasSubFolders) {
      if (prefix == "")
        walk(folder, "|-- ");
      else
        walk(folder, "  "+prefix);
    }
  };

  walk = function(rootFolder, prefix) {
    //create an array with all the folders in it
    let subFoldersIterator = rootFolder.subFolders; // nsIMsgFolder
    let ftvItems = Array();
    while (subFoldersIterator.hasMoreElements()) {
      let subFolder = subFoldersIterator.getNext().QueryInterface(Components.interfaces.nsIMsgFolder);
      ftvItems.push(new opener.ftvItem(subFolder));
    }
    ftvItems.sort(sort_func);

    //generate the listitems while at the same time setting the key in tbsf_data
    //for the sort index, AND take care of swapping with the next item if moving
    //something
    let k = 0;
    while (k < ftvItems.length) {
      let my_url = ftvItems[k]._folder.folderURL;
      let next_url = k < ftvItems.length - 1 ? ftvItems[k+1]._folder.folderURL : null;
      if ((my_url == move_down && k < ftvItems.length - 1) || (next_url && next_url == move_up)) {
        move_up = null;
        move_down = null;
        i++;
        generate(ftvItems[k+1], prefix);
        i++;
        generate(ftvItems[k], prefix);
        k += 2;
      } else {
        i++;
        generate(ftvItems[k], prefix);
        k++;
      }
    }
  }
  walk(rootFolder, "");
}

function move_up() {
  fill_manual_sort($("#folders_list")[0].value, null);
}

function move_down() {
  fill_manual_sort(null, $("#folders_list")[0].value);
}

function get_sort_method_for_account(aAccount) {
  if (tbsf_data[aAccount] && tbsf_data[aAccount][0] !== undefined)
    return tbsf_data[aAccount][0];
  else
    return 0;
}

function on_account_changed() {
  //update the UI
  let new_account = $("#accounts_menu").parent().attr("label");
  if (new_account != current_account) {
    current_account = new_account;
    let sort_method = get_sort_method_for_account(current_account);
    $("#sort_method")[0].value = sort_method;
    on_sort_method_changed();
  }
}

function on_sort_method_changed() {
  let sort_method = $("#sort_method").attr("value");
  tbsf_data[current_account][0] = sort_method;
  if (sort_method == 2) {
    $("#default_sort_box").css("display", "none");
    $("#alphabetical_sort_box").css("display", "none");
    $("#manual_sort_box").css("display", "");
    fill_manual_sort();
  } else if (sort_method == 1) {
    $("#default_sort_box").css("display", "none");
    $("#alphabetical_sort_box").css("display", "");
    $("#manual_sort_box").css("display", "none");
  } else if (sort_method == 0) {
    $("#default_sort_box").css("display", "");
    $("#alphabetical_sort_box").css("display", "none");
    $("#manual_sort_box").css("display", "none");
  }

}

function on_ok() {
  tbsf_prefs.setValue("tbsf_data", JSON.stringify(tbsf_data));
  window.close();
}

function on_cancel() {
  window.close();
}
