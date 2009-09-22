var g_accounts = Object();
var tbsf_prefs = Application.extensions.get("tbsortfolders@xulforum.org").prefs;
var tbsf_data;
var current_account = null;

function dumpTree(node, prefix) {
  if (prefix === undefined) prefix = "";
  dump(prefix+node.tagName+"\n");
  for (let i = 0; i < node.children.length; i++)
    dumpTree(node.children[i], prefix+" ");
}

function encodeFolderURL(s) {
  let elts = s.split("/");
  for (let i = 3; i < elts.length; ++i)
    elts[i] = rawurlencode(elts[i]);
  return elts.join("/");
}

function rebuildTree() {
  let mySort = function(aTreeItems) {
    let treeItems = Array();
    let key = function(treeItem) encodeFolderURL(treeItem.querySelector("treerow > treecell").getAttribute("value"));
    let label = function(treeItem) treeItem.querySelector("treerow > treecell").getAttribute("label");
    let myFtvItem = function(treeItem) {
      let url = key(treeItem);
      let text = label(treeItem);
      return { _folder: { folderURL: url }, text: text };
    }

    for (let i = 0; i < aTreeItems.length; ++i)
      treeItems.push(aTreeItems[i]);
    for (let i = 0; i < treeItems.length; ++i) {
      //dump(label(treeItems[i])+"\n");
      let nTreeItems = treeItems[i].querySelectorAll("treechildren > treeitem");
      if (nTreeItems.length)
        mySort(nTreeItems);
    }
    treeItems.sort(function (c1, c2) tbsf_sort_functions[2](tbsf_data[current_account][1], myFtvItem(c1), myFtvItem(c2)));
    for (let i = 0; i < treeItems.length; ++i)
      treeItems[i].parentNode.appendChild(treeItems[i].parentNode.removeChild(treeItems[i]));

    /*for (k in tbsf_data[current_account][1])
      dump(k+"\n");
    for (let i = 0; i < treeItems.length; ++i)
      dump(key(treeItems[i])+"\n");*/
  }

  let children = document.querySelectorAll("#foldersTree > treechildren > treeitem");
  mySort(children);
}

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

  let someListener = {
    //item: null,
    willRebuild : function(builder) {
      //this.item = builder.getResourceAtIndex(builder.root.currentIndex);
    },
    didRebuild : function(builder) {
      /*if (this.item) {
        var idx = builder.getIndexOfResource(this.item)
        if (idx != -1) builder.root.view.selection.select(idx);
      }*/

      //dumpTree(document.getElementById("foldersTree"), "");

      rebuildTree();
    }
  };

  document.getElementById("foldersTree").builder.addListener(someListener);

  on_account_changed();
}

function fill_manual_sort(move_up, move_down) {
  if (!tbsf_data[current_account][1])
    tbsf_data[current_account][1] = {};

  let account = g_accounts[current_account];
  let rootFolder = account.incomingServer.rootFolder; // nsIMsgFolder
  let tree = document.getElementById("foldersTree");
  tree.setAttribute("ref", rootFolder.URI);

  /*$("#folders_list").empty();

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
  walk(rootFolder, "");*/
}

function move_up(index) {
  //fill_manual_sort($("#folders_list")[0].value, null);
  let tree = document.getElementById("foldersTree");
  let treeItem = tree.view.getItemAtIndex(index);
  let uri = tree.view.getCellValue(index, tree.columns.getColumnAt(0));
  uri = encodeFolderURL(uri);
  dump(uri+"\n");
  if (treeItem.previousSibling) {
    dump("Ok\n");
    let previousUri = tree.view.getCellValue(index - 1, tree.columns.getColumnAt(0));
    previousUri = encodeFolderURL(previousUri);
    let data = tbsf_data[current_account][1];
    data[previousUri]++;
    data[uri]--;
    rebuildTree();
  }
}

function on_move_up() {
  let tree = document.getElementById("foldersTree");
  let i = tree.currentIndex;
  move_up(i);
  if (i > 0)
    tree.view.selection.select(i-1);
}

function on_move_down() {
  let tree = document.getElementById("foldersTree");
  let treeItem = tree.view.getItemAtIndex(tree.currentIndex);
  let i = tree.currentIndex;
  if (treeItem.nextSibling) {
    move_up(i + 1);
    tree.view.selection.select(i+1);
  }
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
