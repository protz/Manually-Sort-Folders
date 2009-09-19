var g_accounts = Object();

var tbsf_prefs = Application.extensions.get("tbsortfolders@xulforum.org").prefs;
var tbsf_data;

function on_load() {
  let json = tbsf_prefs.getValue("tbsf_data", JSON.stringify(Object()));
  //dump("Stored JSON "+json+"\n");
  tbsf_data = JSON.parse(json);

  let acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"]
                          .getService(Components.interfaces.nsIMsgAccountManager);
  let accounts = acctMgr.accounts;
  let name;
  for (var i = 0; i < accounts.Count(); i++) {
    let account = accounts.QueryElementAt(i, Components.interfaces.nsIMsgAccount);
    name = account.incomingServer.rootFolder.prettiestName;
    let $it = $(document.createElement("menuitem")).attr("label", name);
    g_accounts[name] = account;
    $("#accounts_menu").append($it);
    if (!tbsf_data[name]) tbsf_data[name] = Array();
  }
  $("#accounts_menu").parent().attr("label", name);
  on_account_changed();
}

var current_account = null;

function fill_manual_sort(move_up, move_down) {
  if (!tbsf_data[current_account][1]) {
    dump("!!! No manual sort data yet...\n");
    tbsf_data[current_account][1] = {};
  }

  dump("Current account: "+current_account+"\n");
  //dump("tbsf_data[current_account] "+JSON.stringify(tbsf_data[current_account])+"\n");
  dump("Moving up "+move_up+" current position "+tbsf_data[current_account][1][move_up]+"\n");
  dump("Moving down "+move_down+" current position "+tbsf_data[current_account][1][move_down]+"\n");

  $("#folders_list").empty();
  let account = g_accounts[current_account];
  let rootFolder = account.incomingServer.rootFolder; // nsIMsgFolder

  let sort_func = function(a,b) tbsf_sort_functions[2](tbsf_data[current_account][1], a, b);
  /*for (let k in tbsf_data[current_account][1]) {
    dump(tbsf_data[current_account][1][k]+" "+k+"\n");
  }*/

  let walk;
  let i = 0;
  let generate = function(ftvItem, prefix) {
    let folder = ftvItem._folder;
    //dump(i+ " " + folder.folderURL+"\n");
    tbsf_data[current_account][1][folder.folderURL] = i;

    let name = prefix+folder.prettiestName+" "+i;
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
    let subFoldersIterator = rootFolder.subFolders; // nsIMsgFolder
    let ftvItems = Array();
    while (subFoldersIterator.hasMoreElements()) {
      let subFolder = subFoldersIterator.getNext().QueryInterface(Components.interfaces.nsIMsgFolder);
      ftvItems.push(new opener.ftvItem(subFolder));
    }
    ftvItems.sort(sort_func);
    //ftvItems.sort(function (a,b) tbsf_data[current_account][1][a._folder.folderURL] > tbsf_data[current_account][1][b._folder.folderURL]);
    //for (f in ftvItems) dump(ftvItems[f]._folder.prettiestName+" "); dump("\n");

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
  if (tbsf_data[aAccount])
    return tbsf_data[aAccount][0];
  else
    return 0;
}

function on_account_changed() {
  //update the UI
  let new_account = $("#accounts_menu").parent().attr("label");
  if (new_account != current_account) {
    current_account = new_account;
    var sort_method = get_sort_method_for_account(new_account);
    dump("Previous sort method for account "+current_account+" "+sort_method+"\n");
    $("#sort_method")[0].value = sort_method;
    on_sort_method_changed();
  }
}

function on_sort_method_changed() {
  let sort_method = $("#sort_method").attr("value");
  tbsf_data[current_account][0] = sort_method;
  if (sort_method == 2) {
    $("#manual_sort_box").css("visibility", "");
    fill_manual_sort();
  } else {
    $("#manual_sort_box").css("visibility", "hidden");
  }
}

function on_ok() {
  on_account_changed();
  tbsf_prefs.setValue("tbsf_data", JSON.stringify(tbsf_data));
  window.close();
}

function on_cancel() {
  window.close();
}
