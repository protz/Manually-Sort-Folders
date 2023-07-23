var preferences;

function getFolderId(folder) {
    let data = `${folder.accountId}:${folder.path}`;
    return data;

    let arr = new TextEncoder().encode(data);
    let str = "";
    for (let i = 0; i < arr.length; i += 65536) {
      str += String.fromCharCode.apply(null, arr.subarray(i, i + 65536));
    }
    return btoa(str);
}


/**
 * M-C has still not enabled "svg.context-properties.content.enabled" by default.
 * With that enabled, WebExtensions could use the icons as follows:
 * 
 * #foldersTree {
 *     list-style-image: var(--folder-pane-draft);
 *     fill: color-mix(in srgb, var(--color-purple-60) 20%, transparent);
 *     fill-opacity: color-mix(in srgb, var(--color-purple-60) 20%, transparent);
 *     stroke: var(--color-purple-60);
 *     -moz-context-properties:fill-opacity, fill, stroke;
 * }
 * 
 * As a workaround, we load the SVG as an OBJECT and manipulate the attributes.
 * An alternative would be to modify the SVG.
 */
function createFolderEntry(folder) {
    let type = folder.type;
    if (!type) type = "folder"
    else if (type == "drafts") type = "draft";

    function clickHandler(e) {
        e.preventDefault();
        e.stopImmediatePropagation();

        let tree = document.getElementById("foldersTree");
        let selectEntry = tree.querySelector('[aria-selected="true"]');
        if (selectEntry) {
            selectEntry.setAttribute('aria-selected', false);
        }
        e.target.closest("li").setAttribute('aria-selected', true);
    }

    let color = getComputedStyle(document.documentElement).getPropertyValue(`--folder-color-${type}`);
    let icon = `/images/folder-${type}.svg`;

    let li = document.createElement("li");
    let hbox = document.createElement("div");
    hbox.classList.add("hbox");

    let object = document.createElement("object");
    object.addEventListener("load", (e) => {
        let svg = e.target.getSVGDocument();
        let paths = svg.querySelectorAll("path");
        paths[0].setAttribute("fill", `color-mix(in srgb, ${color} 20%, transparent)`); //fill
        paths[1].setAttribute("fill", color); //stroke
    })
    object.addEventListener("click", clickHandler)
    object.setAttribute("type", "image/svg+xml");
    object.setAttribute("data", icon);
    hbox.appendChild(object);

    let div = document.createElement("div");
    div.textContent = folder.name;
    hbox.appendChild(div);
    hbox.addEventListener("click", clickHandler)

    li.appendChild(hbox);

    li.dataset.folderName = folder.name;
    li.dataset.sortKey = preferences.folderSort.get(getFolderId(folder));
    li.dataset.path = folder.path;
    li.dataset.accountId = folder.accountId;

    return li;
}
// (Re-)load the sorted folders into the foldersTree element, according to the
// selected folder and sort type.
async function loadSortedFolderEntries() {
    let tree = document.getElementById("foldersTree");
    let accountId = document.getElementById("folder_accounts_list").value;
    let account = await browser.accounts.get(accountId, true);
    let type = document.getElementById("folder_sort_method").value;
    let folders = [];

    // First, add folders with a sortKey already.
    let largestIdx = 0;
    for (let folder of account.folders) {
        let folderId = getFolderId(folder);
        if (preferences.folderSort.has(folderId)) {
            largestIdx = Math.max(largestIdx, preferences.folderSort.get(folderId));
            folders.push(createFolderEntry(folder));
        }
    }
    // Second, add folders without a sortKey and define one.
    for (let folder of account.folders) {
        let folderId = getFolderId(folder);
        if (!preferences.folderSort.has(folderId)) {
            preferences.folderSort.set(folderId, ++largestIdx);
            folders.push(createFolderEntry(folder));
        }
    }

    // Clear current list.
    while (tree.firstChild) {
        tree.removeChild(tree.lastChild);
    }

    // Hide/Show information based on current sort type.
    let sortMap = {
        "default_sort_box": ["0"],
        "alphabetical_sort_box": ["1", "3"],
        "manual_sort_box": ["2"]
    };
    for (let [id, values] of Object.entries(sortMap)) {
        document.getElementById(id).style.display = values.includes(type) ? "block" : "none";
    }

    // Sort.
    switch (type) {
        case "1": // asc
            folders.sort((a, b) => b.dataset.folderName < a.dataset.folderName)
            break;
        case "3": // desc
            folders.sort((a, b) => b.dataset.folderName > a.dataset.folderName)
            break;
        case "2": // custom
            folders.sort((a, b) => parseInt(b.dataset.sortKey) < parseInt(a.dataset.sortKey))
            break;
    }

    // Add sorted entries to DOM.
    for (let elem of folders) {
        tree.appendChild(elem);
    }

}

function tablistClickHandler(elem) {
    let target = elem.target;

    if (target.parentNode.id != 'tablist') return false;

    let selectedTab = document.querySelector('[aria-selected="true"]');
    selectedTab.setAttribute('aria-selected', false);
    target.setAttribute('aria-selected', true);

    let panels = document.querySelector('[aria-hidden="false"]');
    panels.setAttribute('aria-hidden', true);

    let panelId = target.getAttribute('aria-controls'),
        panel = document.getElementById(panelId);
    panel.setAttribute('aria-hidden', false);
}

function on_extra_hide_folder_icons_changed(e) { 
    preferences.hideFolderIcon = document.getElementById("extra_hide_folder_icons").checked;
}
function on_extra_pick_startup_folder(e) {
    preferences.startupFolder = document.getElementById("extra_startup_folder").value;
}

function on_folder_account_changed() {
    let accountId = document.getElementById("folder_accounts_list").value;

    if (!preferences.accountSettings.has(accountId)) {
        preferences.accountSettings.set(accountId, {
            type: "0",
        })
    };

    document.getElementById("folder_sort_method").value = preferences.accountSettings.get(accountId).type;
    loadSortedFolderEntries();
}
function on_folder_sort_method_changed() {
    let accountId = document.getElementById("folder_accounts_list").value;
    preferences.accountSettings.get(accountId).type = document.getElementById("folder_sort_method").value;
    loadSortedFolderEntries();
}
// Move the actual DOM elements, update sort state.
function on_folder_move_up(e) {
    let tree = document.getElementById("foldersTree");
    let selectEntry = tree.querySelector('[aria-selected="true"]');
    if (selectEntry.previousSibling) {
        let key1 = selectEntry.dataset.sortKey;
        let key2 = selectEntry.previousSibling.dataset.sortKey;
        let path1 = selectEntry.dataset.path
        let path2 = selectEntry.previousSibling.dataset.path;

        // Update DOM elements.
        selectEntry.dataset.sortKey = key2;
        selectEntry.previousSibling.dataset.sortKey = key1;
        tree.insertBefore(selectEntry, selectEntry.previousSibling);

        // Update sort state.
        let accountId = selectEntry.dataset.accountId;
        preferences.folderSort.set(getFolderId({ accountId, path: path1 }), parseInt(key2));
        preferences.folderSort.set(getFolderId({ accountId, path: path2 }), parseInt(key1));
    }
}
// Move the actual DOM elements, update sort state.
function on_folder_move_down(e) {
    let tree = document.getElementById("foldersTree");
    let selectEntry = tree.querySelector('[aria-selected="true"]');
    if (selectEntry.nextSibling) {
        let key1 = selectEntry.dataset.sortKey;
        let key2 = selectEntry.nextSibling.dataset.sortKey;
        let path1 = selectEntry.dataset.path
        let path2 = selectEntry.nextSibling.dataset.path;

        // Update DOM elements.
        selectEntry.dataset.sortKey = key2;
        selectEntry.nextSibling.dataset.sortKey = key1;
        tree.insertBefore(selectEntry.nextSibling, selectEntry)

        // Update sort state.
        let accountId = selectEntry.dataset.accountId;
        preferences.folderSort.set(getFolderId({ accountId, path: path1 }), parseInt(key2));
        preferences.folderSort.set(getFolderId({ accountId, path: path2 }), parseInt(key1));
    }
}
// Update sort state, redraw folders.
async function on_folder_sort_alpha(e) {
    let accountId = document.getElementById("folder_accounts_list").value;
    let { folders } = await browser.accounts.get(accountId, true);

    let sensitivity = document.getElementById("sort_folder_name_case_sensitive").checked
        ? "case"
        : "base";
    folders.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity }));

    // Save sorted list as custom sort.
    let i = 0;
    for (let folder of folders) {
        preferences.folderSort.set(getFolderId(folder), i++);
    }
    loadSortedFolderEntries();
}

async function save() {
    await browser.storage.local.set(preferences);
    document.getElementById("save_message").style.display = "block";

    // Update all open tabs!
    let tabs = (await browser.tabs.query({})).filter(t => ["mail"].includes(t.type));
    for (let tab of tabs) {
       await browser.CustomFolderSort.update(tab.id, preferences);
    }

    await new Promise(r => window.setTimeout(r, 1000));
    document.getElementById("save_message").style.display = "none";
}

async function load() {
    i18n.updateDocument();

    preferences = await browser.storage.local.get({ 
        accountSettings: new Map(), 
        folderSort: new Map(),
        hideFolderIcon: false,
        startupFolder: ""
     })

    const elementEventMap = {
        tablist: { type: "click", callback: tablistClickHandler },
        save_button: { type: "click", callback: save },
        //account_up_button: { type: "click", callback: on_account_move_up },
        //account_down_button: { type: "click", callback: on_account_move_down },
        //account_alpha_button:{ type: "click", callback: on_account_sort_alpha },

        folder_accounts_list: { type: "change", callback: on_folder_account_changed },
        folder_sort_method: { type: "change", callback: on_folder_sort_method_changed },
        folder_up_button: { type: "click", callback: on_folder_move_up },
        folder_down_button: { type: "click", callback: on_folder_move_down },
        folder_alpha_button: { type: "click", callback: on_folder_sort_alpha },

        extra_hide_folder_icons: { type: "click", callback: on_extra_hide_folder_icons_changed },
        extra_startup_folder: { type: "change", callback: on_extra_pick_startup_folder },
    }

    for (let [elementId, eventData] of Object.entries(elementEventMap)) {
        document.getElementById(elementId).addEventListener(eventData.type, eventData.callback);
    }

    // Load accounts into various dropdowns.
    let accounts = await browser.accounts.list();
    for (let account of accounts) {
        // Fill folder_accounts_list select.
        let option = document.createElement('option');
        option.label = account.name;
        option.value = account.id;
        document.getElementById("folder_accounts_list").appendChild(option.cloneNode(true));
        document.getElementById("accounts_list").appendChild(option);

        if (!preferences.accountSettings.has(account.id)) {
            preferences.accountSettings.set(account.id, {
                type: "0",
            })
        };

        // Fill extra_startup_folder select.
        if (account.folders && account.folders.length > 0) {
            let optgroup = document.createElement('optgroup');
            optgroup.label = account.name;
            document.getElementById("extra_startup_folder").appendChild(optgroup);
            account.folders.forEach(f => {
                let option = document.createElement('option');
                option.label = f.name;
                option.value = getFolderId(f);
                document.getElementById("extra_startup_folder").appendChild(option);
            })
        }
    }

    // Load hide icons pref.
    document.getElementById("extra_hide_folder_icons").checked = preferences.hideFolderIcon;

    // Load startupFolder.
    if (preferences.startupFolder) {
        document.getElementById("extra_startup_folder").value = preferences.startupFolder;
    }

    // Load the sorted folder entries.
    on_folder_account_changed();
}

window.addEventListener("load", load);
