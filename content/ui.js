const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
Cu.import("resource://tbsortfolders/sort.jsm");
Cu.import("resource:///modules/MailUtils.js");
Cu.import("resource:///modules/iteratorUtils.jsm"); // for fixIterator

var g_accounts = Object();
//const tbsf_prefs = Application.extensions.get("tbsortfolders@xulforum.org").prefs;
const tbsf_prefs = Cc["@mozilla.org/preferences-service;1"]
  .getService(Ci.nsIPrefService)
  .getBranch("extensions.tbsortfolders@xulforum.org.");
var tbsf_data = {};
var current_account = null;

function get_pref_branch(s)
{
	return Cc["@mozilla.org/preferences-service;1"]
  .getService(Ci.nsIPrefService)
  .getBranch(s);
}

/* Most of the functions below are for *folder* sorting */

function assert(v, s) {
  if (!v) {
    console.error("Assertion failure "+s);
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
  //return tree_item.querySelector("treerow > treecell").getAttribute("value");
  for (let i = 0; i < tree_item.children.length; ++i)
    if (tree_item.children[i].tagName == "treerow")
      return tree_item.children[i].firstChild.getAttribute("value");
  console.error("TBSortFolders: severe error, no item key for "+tree_item+"\n");
}

function item_label(tree_item) {
  //return tree_item.querySelector("treerow > treecell").getAttribute("label");
  for (let i = 0; i < tree_item.children.length; ++i)
    if (tree_item.children[i].tagName == "treerow")
      return tree_item.children[i].firstChild.getAttribute("label");
  console.error("TBSortFolders: severe error, no item label for "+tree_item+"\n");
}

let rdfService = Cc['@mozilla.org/rdf/rdf-service;1'].getService(Ci.nsIRDFService);
let ftvItems = {};

function rebuild_tree(full, collapse) {
  //dump("rebuild_tree("+full+");\n");
  let dfs = 0;
  /* Cache these expensive calls. They're called for each comparison :( */
  let myFtvItem = function(tree_item) {
    if (!ftvItems[tree_item.id]) {
      let text = item_label(tree_item);
      let folder = rdfService.GetResource(tree_item.id);
      folder.QueryInterface(Ci.nsIMsgFolder);
      ftvItems[tree_item.id] = { _folder: folder, text: text };
    }
    return ftvItems[tree_item.id];
  }
  let sort_function;
  let replace_data = false;
  let sort_method = tbsf_data[current_account][0];
  if (sort_method == 0) {
      //dump("0\n");
      sort_function = (c1, c2) => tbsf_sort_functions[0](myFtvItem(c1), myFtvItem(c2));
  } else if (sort_method == 1) {
      //dump("1\n");
      sort_function = (c1, c2) => tbsf_sort_functions[1](myFtvItem(c1), myFtvItem(c2));
  } else if (sort_method == 2) {
      //dump("2\n");
      sort_function =
        (c1, c2) => tbsf_sort_functions[2](tbsf_data[current_account][1], myFtvItem(c1), myFtvItem(c2));
      replace_data = true;
  }
  let fresh_data = {};
  let my_sort = function(a_tree_items, indent) {
    let tree_items = Array();
    //tree_items = a_tree_items;

    //dump(indent+a_tree_items.length+" nodes passed\n");
    for (let i = 0; i < a_tree_items.length; ++i)
      tree_items.push(a_tree_items[i]);
    tree_items.sort(sort_function);

    //dump(indent+tree_items.length+" folders to examine\n");
    for (let i = 0; i < tree_items.length; ++i) {
      dfs++;
      //let data = tbsf_data[current_account][1];
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
      fresh_data[item_key(tree_items[i])] = dfs;
      if (full) {
        //dump(indent+"### Rebuilding "+dfs+" is "+item_key(tree_items[i])+"\n");
      }

      //let n_tree_items = tree_items[i].querySelectorAll("[thisnode] > treechildren > treeitem");
      let n_tree_items = [];
      for (let j = 0; j < tree_items[i].children.length; ++j)
        if (tree_items[i].children[j].tagName == "treechildren")
          n_tree_items = tree_items[i].children[j].children;
      if (n_tree_items.length) {
        my_sort(n_tree_items, indent+" ");
        if (collapse
            && tree_items[i].getAttribute("container") == "true"
            && tree_items[i].getAttribute("open") == "true")
          tree_items[i].setAttribute("open", "false");
      }
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
        parent.insertBefore(parent.removeChild(parent.children[i+1]), parent.children[i]);
      }
    }
  }

  let children = document.querySelectorAll("#foldersTree > treechildren > treeitem");
  my_sort(children, "");
  if (replace_data)
    tbsf_data[current_account][1] = fresh_data; //this "fresh" array allows us to get rid of old folder's keys

}

function on_load() {
  let json = tbsf_prefs.getStringPref("tbsf_data");
  try {
    tbsf_data = JSON.parse(json);
  } catch (e) {
  }

  let account_manager = Cc["@mozilla.org/messenger/account-manager;1"].getService(Ci.nsIMsgAccountManager);
  let name;
  let accounts_menu = document.getElementById("accounts_menu");
  let accounts = [];
  for (let x of fixIterator(account_manager.accounts, Ci.nsIMsgAccount))
    accounts.push(x);
  if (!accounts.length) {
    document.querySelector("tabbox").style.display = "none";
    document.getElementById("err_no_accounts").style.display = "";
    return;
  }
  for (let account of accounts) {
    //dump(Object.keys(account)+"\n");
    //fill the menulist with the right elements
    if (!account.incomingServer)
      continue;
    //dump(account.incomingServer.rootFolder.prettyName+"\n");
    name = account.incomingServer.rootFolder.prettyName;
    let it = document.createElement("menuitem");
    it.setAttribute("label", name);
    accounts_menu.appendChild(it);

    //register the account for future use, create the right data structure in
    //the data
    g_accounts[name] = account;
    if (!tbsf_data[name]) tbsf_data[name] = Array();
  }
  document.getElementById("accounts_menu").parentNode.setAttribute("label", name);

  /* That one is actually triggered once (after the template is built on load) */
  let folders_tree = document.getElementById("foldersTree");
  let some_listener = {
    willRebuild : function(builder) { },
    didRebuild : function(builder) {
      //dump("Tree rebuilt\n");
      rebuild_tree(true);
    }
  };
	/* NOT WORKING IN TB60  */
	try {
    folders_tree.builder.addListener(some_listener);
    window.addEventListener("unload", function () { folders_tree.builder.removeListener(some_listener); }, false);
	} catch (e) {
		console.error("Failed to add listener to folders tree. Probably running on TB 60.");
	}

  /* That one tracks changes that happen to the folder pane *while* the manually
   * sort folders dialog is open */
  /*let rdf_source = Components.classes["@mozilla.org/rdf/datasource;1?name=mailnewsfolders"].
    getService(Components.interfaces.nsIRDFDataSource);
  let some_observer = {
    onAssert: function () {},
    onBeginUpdateBatch: function () {},
    onEndUpdateBatch: function () {},
    onChange: function () {
      dump("*** rdf:mailnewsfolders changed, rebuilding tree...\n");
      rebuild_tree(true);
    },
    onMove: function () {},
    onUnassert: function () {}
  };
  rdf_source.AddObserver(some_observer);
  window.addEventListener("unload", function () { dump("Removed observer\n"); rdf_source.RemoveObserver(some_observer); }, false);*/

  on_account_changed();

  accounts_on_load();
  extra_on_load();
}

function renumber(treeItem, start) {
  tbsf_data[current_account][1][item_key(treeItem)] = start++;
  let children = []; // = treeItem.querySelectorAll("treechildren > treeitem"); but only starting from the root
  for (let j = 0; j < treeItem.children.length; ++j)
    if (treeItem.children[j].tagName == "treechildren")
      children = treeItem.children[j].children;

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
    //tree.builder.rebuild();
  } else {
    //dump("This is unexpected\n");
  }
  /*for (let i = 0; i < 10; ++i) {
    let tree_item = tree.view.getItemAtIndex(i);
    let k = item_key(tree_item);
    dump(tbsf_data[current_account][1][k]+" ");
  } dump("\n");*/
}

function on_move_up() {
  let tree = document.getElementById("foldersTree");
  let i = tree.currentIndex;
  if (i < 0) return;
  let tree_item = tree.view.getItemAtIndex(tree.currentIndex);
  if (tree_item.previousSibling) {
    move_up(tree_item);
    tree.view.selection.select(tree.view.getIndexOfItem(tree_item));
  }
}

function on_move_down() {
  let tree = document.getElementById("foldersTree");
  let i = tree.currentIndex;
  if (i < 0) return;
  let tree_item = tree.view.getItemAtIndex(tree.currentIndex);
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

function update_tree() {
  let account = g_accounts[current_account];
  let root_folder = account.incomingServer.rootFolder; // nsIMsgFolder
  let tree = document.getElementById("foldersTree");
  tree.setAttribute("ref", root_folder.URI);
}

function on_account_changed() {
  //update the UI
  let new_account = document.getElementById("accounts_menu").parentNode.getAttribute("label");
  if (new_account != current_account) {
    current_account = new_account;
    let sort_method = get_sort_method_for_account(current_account);
    document.getElementById("sort_method").value = sort_method;
    update_tree();
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
    if (!tbsf_data[current_account][1])
      tbsf_data[current_account][1] = {};
  } else if (sort_method == 1) {
    document.getElementById("default_sort_box").style.display = "none";
    document.getElementById("alphabetical_sort_box").style.display = "";
    document.getElementById("manual_sort_box").style.display = "none";
  } else if (sort_method == 0) {
    document.getElementById("default_sort_box").style.display = "";
    document.getElementById("alphabetical_sort_box").style.display = "none";
    document.getElementById("manual_sort_box").style.display = "none";
  }
	// COMMENTED OUT FOR NOW to avoid destroying existing sort prefs
	// tbsf_prefs.setStringPref("tbsf_data", JSON.stringify(tbsf_data));
  rebuild_tree(true, true);
}

function on_close() {
  on_refresh();
  window.close();
}

function on_refresh() {
  // COMMENTED OUT FOR NOW to avoid destroying existing sort prefs
  // tbsf_prefs.setStringPref("tbsf_data", JSON.stringify(tbsf_data));

  //it's a getter/setter so that actually does sth
  let mainWindow = Cc['@mozilla.org/appshell/window-mediator;1']
    .getService(Ci.nsIWindowMediator)
    .getMostRecentWindow("mail:3pane");
  mainWindow.gFolderTreeView.mode = mainWindow.gFolderTreeView.mode;
}

window.addEventListener("unload", on_refresh, false);


/* The functions below are for *account* sorting */

var g_other_accounts = null;

function accounts_on_load() {
  let accounts = get_pref_branch("mail.accountmanager.").getStringPref("accounts").split(",");
  let defaultaccount = get_pref_branch("mail.accountmanager.").getStringPref("defaultaccount");
  accounts = accounts.filter((x) => x != defaultaccount);
  accounts = [defaultaccount].concat(accounts);
  let servers = accounts.map((a) => get_pref_branch("mail.account." + a + ".").getStringPref("server"));
  let types = servers.map((s) => get_pref_branch("mail.server." + s + ".").getStringPref("type"));
  let names = servers.map(function (s) {
    try {
      return get_pref_branch("mail.server." + s + ".").getStringPref("name");
    } catch (e) {
      return get_pref_branch("mail.server." + s + ".").getStringPref("hostname");
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
  let news_account_found = false;
  for (let i = 0; i < accounts.length; ++i) {
    switch (types[i]) {
      case "imap":
      case "pop3":
      case "movemail":
      case "rss":
        mail_accounts.unshift([accounts[i], servers[i], types[i], names[i]]);
        add_li(document.getElementById("accounts_list"), mail_accounts[0]);
        document.getElementById("default_account").firstChild.setAttribute("disabled", false);
        /* We're not setting the "first account in the list" value in the UI
         * because it defaults to "first rss or mail account in the list */
        break;
      case "nntp":
        news_account_found = true;
        news_accounts.unshift([accounts[i], servers[i], types[i], names[i]]);
        let mi = document.createElement("menuitem");
        mi.setAttribute("value", accounts[i]);
        mi.setAttribute("label", names[i]);
        document.getElementById("default_account").appendChild(mi);
        add_li(document.getElementById("news_accounts_list"), news_accounts[0]);
        /* Set the "first account in the list value in the UI */
        if (defaultaccount == accounts[i])
          mi.parentNode.parentNode.value = accounts[i];
        break;
      default:
        let hidden = false;
        try {
          let hidden_pref = get_pref_branch("mail.server."+servers[i]+".").getBoolPref("hidden", false);
          hidden = hidden_pref;
        } catch (e) {
        }
        if (!hidden) {
          let mi = document.createElement("menuitem");
          mi.setAttribute("value", accounts[i]);
          mi.setAttribute("label", names[i]);
          document.getElementById("default_account").appendChild(mi);
          /* Set the "first account in the list" value in the UI */
          if (defaultaccount == accounts[i])
            mi.parentNode.parentNode.value = accounts[i];
        }
        other_accounts.unshift([accounts[i], servers[i], types[i], names[i]]);
    }
  }
  g_other_accounts = other_accounts;
  if (news_account_found) {
    document.getElementById("news_accounts_list").style.display = "";
  }
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

  get_pref_branch("mail.accountmanager.").setStringPref("accounts", new_pref);

  let default_account = document.getElementById("default_account").parentNode.value;
  if (default_account == "-1")
    get_pref_branch("mail.accountmanager.").setStringPref("defaultaccount", first_mail_account);
  else
    get_pref_branch("mail.accountmanager.").setStringPref("defaultaccount", default_account);
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
  let mainWindow = Cc['@mozilla.org/appshell/window-mediator;1']
    .getService(Ci.nsIWindowMediator)
    .getMostRecentWindow("mail:3pane");
  mainWindow.setTimeout(function () { mainWindow.Services.startup.quit(Ci.nsIAppStartup.eAttemptQuit | Ci.nsIAppStartup.eRestart); }, 1000);
  window.close();
}

function on_accounts_list_click() {
  g_active_list = document.getElementById("accounts_list");
  document.getElementById("news_accounts_list").clearSelection();
}

function on_news_accounts_list_click() {
  g_active_list = document.getElementById("news_accounts_list");
  document.getElementById("accounts_list").clearSelection();
}

/* These are UI functions for the "Extra settings" tab */

/* Borrowed from http://mxr.mozilla.org/comm-central/source/mailnews/base/prefs/content/am-copies.js */
function on_pick_folder(aEvent) {
  let folder = aEvent.target._folder;
  let picker = document.getElementById("startupFolder");
  picker.folder = folder;
  picker.setAttribute("label", folder.prettyName);
  tbsf_prefs.setStringPref("startup_folder", folder.URI);
}

function extra_on_load() {
  let startup_folder = tbsf_prefs.getStringPref("startup_folder");
  let picker = document.getElementById("startupFolder");
  let folder;
  if (startup_folder)
    folder = MailUtils.getFolderForURI(startup_folder);
  if (folder) {
    picker.folder = folder;
    picker.setAttribute("label", folder.prettyName);
  } else {
    let menu = document.getElementById("startup_folder_method");
    menu.value = "0";
    picker.disabled = true;
  }
}

function on_startup_folder_method_changed(event) {
  let menu = event.target;
  let picker = document.getElementById("startupFolder");
  if (menu.value == "1") {
    picker.disabled = false;
    if (picker.folder)
      tbsf_prefs.setStringPref("startup_folder", picker.folder.URI);
  } else {
    picker.disabled = true;
    tbsf_prefs.setStringPref("startup_folder", "");
  }
}
