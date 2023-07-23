var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");

function getAbout3PaneWindow(nativeTab) {
  if (nativeTab.mode && nativeTab.mode.name == "mail3PaneTab") {
    return nativeTab.chromeBrowser.contentWindow
  }
  return null;
}

function reloadFolders(folderPane) {
  for (let mode of Object.values(folderPane._modes)) {
    if (!mode.active) {
      continue;
    }
    mode.containerList.replaceChildren();
    folderPane._initMode(mode);
  }
};

function folderURIToPath(accountId, uri) {
  let server = MailServices.accounts.getAccount(accountId).incomingServer;
  let rootURI = server.rootFolder.URI;
  if (rootURI == uri) {
    return "/";
  }
  // The .URI property of an IMAP folder doesn't have %-encoded characters, but
  // may include literal % chars. Services.io.newURI(uri) applies encodeURI to
  // the returned filePath, but will not encode any literal % chars, which will
  // cause decodeURIComponent to fail (bug 1707408).
  if (server.type == "imap") {
    return uri.substring(rootURI.length);
  }
  let path = Services.io.newURI(uri).filePath;
  return path.split("/").map(decodeURIComponent).join("/");
}

function getFolderId(accountId, path) {
  let data = `${accountId}:${path}`;
  return data;

  let arr = new TextEncoder().encode(data);
  let str = "";
  for (let i = 0; i < arr.length; i += 65536) {
    str += String.fromCharCode.apply(null, arr.subarray(i, i + 65536));
  }
  return btoa(str);
}

async function install(window, preferences) {
  for (let i = 0; i < 20; i++) {
    if (window.folderPane && window.folderPane._initialized) {
      break;
    }
    await new Promise(r => window.setTimeout(r, 125))
  }
  if (!window.folderPane || window.folderPane._manualSortFolderBackupAddSubFolders) {
    return;
  }

  window.folderPane._manualSortFolderBackupAddSubFolders = window.folderPane._addSubFolders;
  window.folderPane._addSubFolders = function (parentFolder, parentRow, modeName, filterFunction) {
    console.log("ManualSortFolders: about:3pane is patched");

    let subFolders = parentFolder.subFolders;
    if (!subFolders.length) {
      return;
    }

    for (let i = 0; i < subFolders.length; i++) {
      let folder = subFolders[i];
      if (this._isGmailFolder(folder)) {
        subFolders.splice(i, 1, ...folder.subFolders);
      }
    }

    let server = parentFolder.server;
    let accountId = MailServices.accounts.FindAccountForServer(server).key;
    let sortType = preferences.accountSettings.has(accountId)
      ? preferences.accountSettings.get(accountId).type
      : null

    switch (sortType) {
      case "2": // custom
        {
          let sortData = new Map();
          // Add custom sortKey
          for (let i = 0; i < subFolders.length; i++) {
            let folder = subFolders[i];
            let path = folderURIToPath(accountId, folder.URI);

            if (preferences.folderSort.has(getFolderId(accountId, path))) {
              sortData.set(folder.URI, preferences.folderSort.get(getFolderId(accountId, path)));
            } else {
              sortData.set(folder.URI, `_${i}`);
            }
          }
          // Custom sort
          subFolders.sort((a, b) => sortData.get(a.URI) > sortData.get(b.URI));
        }
        break;

      case "1":
        subFolders.sort((a, b) => a.prettyName > b.prettyName)
        break;

      case "3":
        subFolders.sort((a, b) => a.prettyName < b.prettyName)
        break;

      default:
        subFolders.sort((a, b) => a.compareSortKeys(b));
    }

    for (let folder of subFolders) {
      if (typeof filterFunction == "function" && !filterFunction(folder)) {
        continue;
      }
      let folderRow = this._createFolderRow(modeName, folder);
      this._addSubFolders(folder, folderRow, modeName, filterFunction);
      parentRow.childList.appendChild(folderRow);
    }
  }

  console.log("ManualSortFolders: patched _addSubFolders(), Reload")
  reloadFolders(window.folderPane);
}

async function uninstall(window) {
  for (let i = 0; i < 20; i++) {
    if (window.folderPane && window.folderPane._initialized) {
      break;
    }
    await new Promise(r => window.setTimeout(r, 125))
  }
  if (!window.folderPane || !window.folderPane._manualSortFolderBackupAddSubFolders) {
    return;
  }

  window.folderPane._addSubFolders = window.folderPane._manualSortFolderBackupAddSubFolders;
  delete window.folderPane._manualSortFolderBackupAddSubFolders;

  console.log("ManualSortFolders: restored _addSubFolders(), Reload")
  reloadFolders(window.folderPane);
}

var CustomFolderSort = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      CustomFolderSort: {
        async patch(tabId, preferences) {
          let { nativeTab } = context.extension.tabManager.get(tabId);
          let about3PaneWindow = getAbout3PaneWindow(nativeTab);
          if (about3PaneWindow) {
            install(about3PaneWindow, preferences);
          }
        },
        async update(tabId, preferences) {
          let { nativeTab } = context.extension.tabManager.get(tabId);
          let about3PaneWindow = getAbout3PaneWindow(nativeTab);
          if (about3PaneWindow) {
            uninstall(about3PaneWindow);
            install(about3PaneWindow, preferences);
          }
        },
      },
    };
  }

  onShutdown(isAppShutdown) {
    if (isAppShutdown) return;

    for (let window of Services.wm.getEnumerator("mail:3pane")) {
      for (let nativeTab of window.gTabmail.tabInfo) {
        let about3PaneWindow = getAbout3PaneWindow(nativeTab);
        if (about3PaneWindow) {
          uninstall(about3PaneWindow);
        }
      }
    }
  }
};
