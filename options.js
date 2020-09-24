/* Higher-order helpers */
function moveUp(parent) {
  return (event) => {
    let li = parent.querySelector(".selected");
    if (li && li != li.parentNode.firstElementChild)
      li.parentNode.insertBefore(li, li.previousElementSibling);
  }
}

function moveDown(parent) {
  return (event) => {
    let li = parent.querySelector(".selected");
    if (li && li != li.parentNode.lastElementChild)
      li.parentNode.insertBefore(li, li.nextElementSibling.nextElementSibling);
  }
}

function select(parent) {
  return (event) => {
    let s = parent.querySelector(".selected");
    if (s)
      s.classList.remove("selected");
    event.target.classList.add("selected");
  }
}

/* Tab navigation */
function initTabs() {
  for (let l of document.querySelectorAll(".tablabel")) {
    let panel = l.dataset.panel;
    l.addEventListener("click", function (event) {
      document.querySelector(".tabpanel.active").classList.remove("active");
      document.getElementById(panel).classList.add("active");
    });
    l.addEventListener("click", select(document.querySelector(".tablabels")));
  }
}

/* Account pane */
function mkAccount(a) {
  let li = document.createElement("li");
  li.classList.add("account-entry");
  li.textContent = a.name;
  li.dataset.id = a.id;
  li.addEventListener("click", select(document.querySelector("#account-list")));
  return li;
}

async function fillAccounts() {
  let accountList = document.getElementById("account-list");
  let accounts = await browser.accounts.list();
  for (let a of accounts) {
    accountList.appendChild(mkAccount(a));
  }
}

async function applyAccountChanges() {
  let accounts = [];
  for (let li of document.querySelectorAll(".account-entry"))
    accounts.push(li.dataset.id);
  await browser.accounts.setOrder(accounts);
}

async function resetAccountChanges() {
  await browser.accounts.setOrder();

  // Query Thunderbird for the new default sort order.
  let accountList = document.getElementById("account-list");
  while (accountList.firstChild)
    accountList.removeChild(accountList.firstChild);
  await fillAccounts();
}

async function initAccountPane() {
  /* Set UI in accordance with what's in the prefs*/
  await fillAccounts();

  /* Event handlers */
  document.querySelector("#account-move-up").addEventListener("click",
    moveUp(document.querySelector("#account-list")));
  document.querySelector("#account-move-down").addEventListener("click",
    moveDown(document.querySelector("#account-list")));
  document.querySelector("#account-apply").addEventListener("click", applyAccountChanges);
  document.querySelector("#account-reset").addEventListener("click", resetAccountChanges);
}

/* Folder pane */

var gCurrentAccount;

function clearFolders() {
  let ul = document.querySelector("#folder-list");
  while (ul.firstChild)
    ul.removeChild(ul.firstChild);
}

function fillFolders(ul, folders) {
  for (let f of folders) {
    let li = document.createElement("li");
    li.textContent = f.name;
    li.classList.add("folder-entry");
    li.addEventListener("click", select(document.querySelector("#folder-list")));

    if (f.subFolders.length > 0) {
      let ul = document.createElement("ul");
      fillFolders(ul, f.subFolders);
      li.appendChild(ul);
    }

    ul.appendChild(li);
  }
}

async function refreshFolders() {
  clearFolders();

  let id = document.getElementById("folders-account").value;
  let a = await browser.accounts.get(id);

  let ul = document.querySelector("#folder-list");
  fillFolders(ul, a.folders);
}

function mkOption(a) {
  let o = document.createElement("option");
  o.textContent = a.name;
  o.value = a.id;
  return o;
}

async function initFolderPane() {
  let accounts = await browser.accounts.list();
  let accountSelect = document.getElementById("folders-account");
  for (let a of accounts) {
    accountSelect.appendChild(mkOption(a));
  }
  accountSelect.addEventListener("change", refreshFolders);
  await refreshFolders();

  document.querySelector("#folder-move-up").addEventListener("click",
    moveUp(document.querySelector("#folder-list")));
  document.querySelector("#folder-move-down").addEventListener("click",
    moveDown(document.querySelector("#folder-list")));
}

/* Global initialization */
async function initOptions() {
  initTabs();
  await initAccountPane();
  await initFolderPane();
}

document.addEventListener("DOMContentLoaded", initOptions);
