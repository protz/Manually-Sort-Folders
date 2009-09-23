var g_accounts = Object();
var tbsf_prefs = Application.extensions.get("tbsortfolders@xulforum.org").prefs;
var tbsf_data;
var current_account = null;

function assert(v, s) {
  if (!v) {
    Application.console.log("Assertion failure "+s);
    throw "Assertion failure";
  }
}

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

function itemKey(treeItem) {
    return encodeFolderURL(treeItem.querySelector("treerow > treecell").getAttribute("value"));
}

function itemLabel(treeItem) {
    return treeItem.querySelector("treerow > treecell").getAttribute("label");
}

function rebuildTree(full) {
  let dfs = 0;
  let mySort = function(aTreeItems) {
    let treeItems = Array();
    let myFtvItem = function(treeItem) {
      let url = itemKey(treeItem);
      let text = itemLabel(treeItem);
      return { _folder: { folderURL: url }, text: text };
    }

    for (let i = 0; i < aTreeItems.length; ++i)
      treeItems.push(aTreeItems[i]);
    treeItems.sort(function (c1, c2) tbsf_sort_functions[2](tbsf_data[current_account][1], myFtvItem(c1), myFtvItem(c2)));

    for (let i = 0; i < treeItems.length; ++i) {
      dfs++;
      let data = tbsf_data[current_account][1];
      if (data[itemKey(treeItems[i])] !== undefined)
        assert(data[itemKey(treeItems[i])] == dfs, "dfs "+dfs+" data "+data[itemKey(treeItems[i])]);
      else
        data[itemKey(treeItems[i])] = dfs;

      let nTreeItems = treeItems[i].querySelectorAll("treechildren > treeitem");
      if (nTreeItems.length)
        mySort(nTreeItems);
    }

    if (full) {
      for (let i = 0; i < treeItems.length; ++i)
        treeItems[i].parentNode.appendChild(treeItems[i].parentNode.removeChild(treeItems[i]));
    } else {
      let i = 0;
      while (i < treeItems.length && treeItems[0].parentNode.children[i] == treeItems[i])
        i++;
      if (i < treeItems.length - 1) {
        let parent = treeItems[0].parentNode;
        parent.insertBefore(parent.removeChild(parent.children[i+1]), parent.children[i]);
      }
    }

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
    let it = document.createElement("menuitem");
    it.setAttribute("label", name);
    document.getElementById("accounts_menu").appendChild(it);

    //register the account for future use, create the right data structure in
    //the data
    g_accounts[name] = account;
    if (!tbsf_data[name]) tbsf_data[name] = Array();
  }
  document.getElementById("accounts_menu").parentNode.setAttribute("label", name);

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

      rebuildTree(true);
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
}

function renumber(treeItem, start) {
  tbsf_data[current_account][1][itemKey(treeItem)] = start++;
  let children = treeItem.querySelectorAll("treechildren > treeitem");
  for (let i = 0; i < children.length; ++i)
    start = renumber(children[i], start);
  return start;
}

function move_up(treeItem) {
  let tree = document.getElementById("foldersTree");
  let uri = itemKey(treeItem);
  //dump(uri+"\n");
  if (treeItem.previousSibling) {
    let previousItem = treeItem.previousSibling;
    let previousUri = itemKey(previousItem);
    let data = tbsf_data[current_account][1];
    renumber(previousItem, renumber(treeItem, data[previousUri]));
    rebuildTree();
  } else {
    dump("This is unexpected\n");
  }
  /*for (let i = 0; i < 10; ++i) {
    let treeItem = tree.view.getItemAtIndex(i);
    let k = itemKey(treeItem);
    dump(tbsf_data[current_account][1][k]+" ");
  } dump("\n");*/
}

function on_move_up() {
  let tree = document.getElementById("foldersTree");
  let treeItem = tree.view.getItemAtIndex(tree.currentIndex);
  let i = tree.currentIndex;
  if (treeItem.previousSibling) {
    move_up(treeItem);
    tree.view.selection.select(tree.view.getIndexOfItem(treeItem));
  }
}

function on_move_down() {
  let tree = document.getElementById("foldersTree");
  let treeItem = tree.view.getItemAtIndex(tree.currentIndex);
  let i = tree.currentIndex;
  if (treeItem.nextSibling) {
    move_up(treeItem.nextSibling);
    tree.view.selection.select(tree.view.getIndexOfItem(treeItem));
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
  let new_account = document.getElementById("accounts_menu").parentNode.getAttribute("label");
  if (new_account != current_account) {
    current_account = new_account;
    let sort_method = get_sort_method_for_account(current_account);
    document.getElementById("sort_method").value = sort_method;
    on_sort_method_changed();
  }
}

function on_sort_method_changed() {
  let sort_method = document.getElementById("sort_method").getAttribute("value");
  tbsf_data[current_account][0] = sort_method;
  if (sort_method == 2) {
    document.getElementById("default_sort_box").style.display = "none";
    document.getElementById("alphabetical_sort_box").style.display = "none";
    document.getElementById("manual_sort_box").style.display = "";
    fill_manual_sort();
  } else if (sort_method == 1) {
    document.getElementById("default_sort_box").style.display = "none";
    document.getElementById("alphabetical_sort_box").style.display = "";
    document.getElementById("manual_sort_box").style.display = "none";
  } else if (sort_method == 0) {
    document.getElementById("default_sort_box").style.display = "";
    document.getElementById("alphabetical_sort_box").style.display = "none";
    document.getElementById("manual_sort_box").style.display = "none";
  }

}

function on_ok() {
  tbsf_prefs.setValue("tbsf_data", JSON.stringify(tbsf_data));
  window.close();
}

function on_cancel() {
  window.close();
}
