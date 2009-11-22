Components.utils.import("resource://tbsortfolders/sort.jsm");

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

function dump_tree(node, prefix) {
  if (prefix === undefined) prefix = "";
  dump(prefix+node.tagName+"\n");
  for (let i = 0; i < node.children.length; i++)
    dump_tree(node.children[i], prefix+" ");
}

function item_key(tree_item) {
  return tree_item.querySelector("treerow > treecell").getAttribute("value");
}

function item_label(tree_item) {
  return tree_item.querySelector("treerow > treecell").getAttribute("label");
}

function rebuild_tree(full) {
  let dfs = 0;
  let my_sort = function(a_tree_items) {
    let tree_items = Array();
    let myFtvItem = function(tree_item) {
      let url = item_key(tree_item);
      let text = item_label(tree_item);
      return { _folder: { folderURL: url, URI: url }, text: text };
    }

    for (let i = 0; i < a_tree_items.length; ++i)
      tree_items.push(a_tree_items[i]);
    tree_items.sort(function (c1, c2) tbsf_sort_functions[2](tbsf_data[current_account][1], myFtvItem(c1), myFtvItem(c2)));

    for (let i = 0; i < tree_items.length; ++i) {
      dfs++;
      let data = tbsf_data[current_account][1];
      /*if (data[item_key(tree_items[i])] !== undefined)
        assert(data[item_key(tree_items[i])] == dfs, "dfs "+dfs+" data "+data[item_key(tree_items[i])]);
      else*/
      /* We need to do this: in case a folder has been deleted in the middle of
      the DFS, the sort keys are not contiguous anymore. However, we wish to
      maintain the invariant that is commented out above (the assert). The
      invariant above (the assert) is broken if a folder has been deleted in the
      meanwhile so we make sure it is enforced with the line below. It only
      changes something in case a folder has been deleted/added since we last
      walked the folder tree.
      
      It is to be remarked that when a folder has been added, it is sorted
      \emph{at the end} of the list (see special case and comments in
      folderPane.js) so the test above gives true (it's undefined) and we set
      the right sort keys. */
      data[item_key(tree_items[i])] = dfs;

      let n_tree_items = tree_items[i].querySelectorAll("treechildren > treeitem");
      if (n_tree_items.length)
        my_sort(n_tree_items);
    }

    if (full) {
      //dummy, slow insertion algorithm (but only used when the folder list is
      //initially built)
      for (let i = 0; i < tree_items.length; ++i)
        tree_items[i].parentNode.appendChild(tree_items[i].parentNode.removeChild(tree_items[i]));
    } else {
      //cleverer one: we know we're only swapping two items
      let i = 0;
      while (i < tree_items.length && tree_items[0].parentNode.children[i] == tree_items[i])
        i++;
      //we found a difference between what we want and the state of the UI: swap
      //current item with the next
      if (i < tree_items.length - 1) {
        let parent = tree_items[0].parentNode;
        parent.insertBefore(parent.removeChild(parent.children[i+1]), parent.children[i]); //XXX bug here?
      }
    }

  }

  let children = document.querySelectorAll("#foldersTree > treechildren > treeitem");
  my_sort(children);

  /*dump("---\n");
  for (k in tbsf_data[current_account][1])
    dump(k+"\n");
  dump("---"+children.length+"\n");
  for (let i = 0; i < children.length; ++i)
    dump(item_key(children[i])+"\n");*/

}

function on_load() {
  let json = tbsf_prefs.getValue("tbsf_data", JSON.stringify(Object()));
  tbsf_data = JSON.parse(json);

  let account_manager = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager);
  let accounts = account_manager.accounts;
  let name;
  let accounts_menu = document.getElementById("accounts_menu");
  for (var i = 0; i < accounts.Count(); i++) {
    //fill the menulist with the right elements
    let account = accounts.QueryElementAt(i, Components.interfaces.nsIMsgAccount);
    name = account.incomingServer.rootFolder.prettiestName;
    let it = document.createElement("menuitem");
    it.setAttribute("label", name);
    accounts_menu.appendChild(it);

    //register the account for future use, create the right data structure in
    //the data
    g_accounts[name] = account;
    if (!tbsf_data[name]) tbsf_data[name] = Array();
  }
  document.getElementById("accounts_menu").parentNode.setAttribute("label", name);

  let some_listener = {
    willRebuild : function(builder) { },
    didRebuild : function(builder) { rebuild_tree(true); }
  };
  document.getElementById("foldersTree").builder.addListener(some_listener);

  on_account_changed();

  accounts_on_load();
}

function fill_manual_sort(move_up, move_down) {
  if (!tbsf_data[current_account][1])
    tbsf_data[current_account][1] = {};

  let account = g_accounts[current_account];
  let root_folder = account.incomingServer.rootFolder; // nsIMsgFolder
  let tree = document.getElementById("foldersTree");
  tree.setAttribute("ref", root_folder.URI);
}

function renumber(treeItem, start) {
  tbsf_data[current_account][1][item_key(treeItem)] = start++;
  let children = treeItem.querySelectorAll("treechildren > treeitem");
  for (let i = 0; i < children.length; ++i)
    start = renumber(children[i], start);
  return start;
}

function move_up(tree_item) {
  let tree = document.getElementById("foldersTree");
  let uri = item_key(tree_item);
  //dump(uri+"\n");
  if (tree_item.previousSibling) {
    let previous_item = tree_item.previousSibling;
    let previous_uri = item_key(previous_item);
    let data = tbsf_data[current_account][1];
    renumber(previous_item, renumber(tree_item, data[previous_uri]));
    rebuild_tree();
  } else {
    dump("This is unexpected\n");
  }
  /*for (let i = 0; i < 10; ++i) {
    let tree_item = tree.view.getItemAtIndex(i);
    let k = item_key(tree_item);
    dump(tbsf_data[current_account][1][k]+" ");
  } dump("\n");*/
}

function on_move_up() {
  let tree = document.getElementById("foldersTree");
  let tree_item = tree.view.getItemAtIndex(tree.currentIndex);
  let i = tree.currentIndex;
  if (i < 0) return;
  if (tree_item.previousSibling) {
    move_up(tree_item);
    tree.view.selection.select(tree.view.getIndexOfItem(tree_item));
  }
}

function on_move_down() {
  let tree = document.getElementById("foldersTree");
  let tree_item = tree.view.getItemAtIndex(tree.currentIndex);
  let i = tree.currentIndex;
  if (i < 0) return;
  if (tree_item.nextSibling) {
    move_up(tree_item.nextSibling);
    tree.view.selection.select(tree.view.getIndexOfItem(tree_item));
  }
}

function get_sort_method_for_account(account) {
  if (tbsf_data[account] && tbsf_data[account][0] !== undefined)
    return tbsf_data[account][0];
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

function on_close() {
  on_refresh();
  window.close();
}

function on_refresh() {
  //it's a getter/setter so that actually does sth
  tbsf_prefs.setValue("tbsf_data", JSON.stringify(tbsf_data));
  window.opener.gFolderTreeView.mode = window.opener.gFolderTreeView.mode;
}

window.addEventListener("unload", on_refresh, false);


/***********************/

/*
 * mail.accountmanager.accounts -> explode(",") -> ["account1", ...]
 * mail.account.account1.server -> "server1"
 * mail.server1.name -> "@free.fr"
 * ! Local Folders, News & Blogs, Smart Folders = valeur spéciale ?
 *
 * mail.accountmanager.defaultaccount DOIT être le premier dans la liste
 * préférence identities uniquement pour les "vrais comptes de mails"
 * */

var g_other_accounts = null;

function accounts_on_load() {
  let accounts = Application.prefs.get("mail.accountmanager.accounts").value.split(",");
  let defaultaccount = Application.prefs.get("mail.accountmanager.defaultaccount").value;
  accounts = accounts.filter(function (x) x != defaultaccount);
  accounts = [defaultaccount].concat(accounts);
  let servers = accounts.map(function (a) Application.prefs.get("mail.account."+a+".server").value);
  let types = servers.map(function (s) Application.prefs.get("mail.server."+s+".type").value);
  let names = servers.map(function (s) {
    try {
      return Application.prefs.get("mail.server."+s+".name").value;
    } catch (e) {
      return Application.prefs.get("mail.server."+s+".hostname").value;
    } });

  let mail_accounts = [];
  let news_accounts = [];
  let other_accounts = [];
  let add_li = function (list, [account, server, type, name]) {
    let li = document.createElement("listitem");
    li.setAttribute("label", name);
    li.value = account;
    list.appendChild(li);
  };
  for (let i = 0; i < accounts.length; ++i) {
    switch (types[i]) {
      case "imap":
      case "pop3":
      case "movemail":
      case "rss":
        mail_accounts.unshift([accounts[i], servers[i], types[i], names[i]]);
        add_li(document.getElementById("accounts_list"), mail_accounts[0]);
        document.getElementById("default_account").firstChild.setAttribute("disabled", false);
        break;
      case "nntp":
        news_accounts.unshift([accounts[i], servers[i], types[i], names[i]]);
        let mi = document.createElement("menuitem");
        mi.setAttribute("value", accounts[i]);
        mi.setAttribute("label", names[i]);
        document.getElementById("default_account").appendChild(mi);
        add_li(document.getElementById("news_accounts_list"), news_accounts[0]);
        if (defaultaccount == accounts[i])
          mi.parentNode.parentNode.value = accounts[i];
        break;
      default:
        let hidden = false;
        try {
          let hidden_pref = Application.prefs.get("mail.server."+servers[i]+".hidden").value;
          hidden = hidden_pref;
        } catch (e) {
        }
        if (!hidden) {
          let mi = document.createElement("menuitem");
          mi.setAttribute("value", accounts[i]);
          mi.setAttribute("label", names[i]);
          document.getElementById("default_account").appendChild(mi);
          if (defaultaccount == accounts[i])
            mi.parentNode.parentNode.value = accounts[i];
        }
        other_accounts.unshift([accounts[i], servers[i], types[i], names[i]]);
    }
  }
  g_other_accounts = other_accounts;
}

function update_accounts_prefs() {
  let accounts = document.getElementById("accounts_list");
  let new_pref = null;
  let first_mail_account = null;
  for (let i = 0; i < accounts.children.length; ++i) {
    let child = accounts.children[i];
    if (!first_mail_account)
      first_mail_account = child.value;
    new_pref = new_pref ? (new_pref + "," + child.value) : child.value;
  }
  for (let i = 0; i < g_other_accounts.length; ++i) {
    let [account, server, type, name] = g_other_accounts[i];
    new_pref = new_pref ? (new_pref + "," + account) : account;
  }
  let news_accounts = document.getElementById("news_accounts_list");
  for (let i = 0; i < news_accounts.children.length; ++i) {
    let child = news_accounts.children[i];
    new_pref = new_pref ? (new_pref + "," + child.value) : child.value;
  }

  let pref = Application.prefs.get("mail.accountmanager.accounts");
  pref.value = new_pref;

  let default_account = document.getElementById("default_account").parentNode.value;
  if (default_account == "-1")
    Application.prefs.get("mail.accountmanager.defaultaccount").value = first_mail_account;
  else
    Application.prefs.get("mail.accountmanager.defaultaccount").value = default_account;
}

function account_move_up(index, listbox) {
  let item = listbox.getItemAtIndex(index);
  if (!item)
    return false;

  let previous_item = item.previousSibling;
  if (!previous_item)
    return false;

  let parent = item.parentNode;
  parent.insertBefore(parent.removeChild(item), previous_item);

  return true;
}

var g_active_list = null;

function on_account_move_up() {
  if (!g_active_list) return;

  let listbox = g_active_list;
  let i = listbox.selectedIndex;
  if (i < 0) return;
  if (account_move_up(i, listbox))
    listbox.selectedIndex = i-1;
  update_accounts_prefs();
}

function on_account_move_down() {
  if (!g_active_list) return;

  let listbox = g_active_list;
  let i = listbox.selectedIndex;
  if (i < 0) return;
  if (account_move_up(i+1, listbox))
    listbox.selectedIndex = i+1;
  update_accounts_prefs();
}

function on_account_restart() {
  Application.restart();
}

function on_accounts_list_click() {
  g_active_list = document.getElementById("accounts_list");
  document.getElementById("news_accounts_list").clearSelection();
}

function on_news_accounts_list_click() {
  g_active_list = document.getElementById("news_accounts_list");
  document.getElementById("accounts_list").clearSelection();
}
