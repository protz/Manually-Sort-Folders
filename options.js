/* Account pane */
function mkAccount(a) {
  let li = document.createElement("li");
  li.classList.add("account-entry");
  li.textContent = a.name + " (" +a.type+")";
  li.dataset.id = a.id;
  li.addEventListener("click", function (event) {
    for (let i of document.querySelectorAll(".account-entry"))
      i.classList.remove("selected");
    li.classList.add("selected");
  });
  return li;
}

function showHideAccount() {
  let check = document.querySelector("#custom-sort");
  let pane = document.querySelector("#account-pane");
  if (check.checked)
    pane.style.display = "";
  else
    pane.style.display = "none";
}

async function applyAccountChanges() {
  let check = document.querySelector("#custom-sort");
  if (check.checked) {
    let accounts = [];
    for (let li of document.querySelectorAll(".account-entry"))
      accounts.push(li.dataset.id);
    browser.accounts.setCustomSort(accounts);
  } else {
    browser.accounts.clearCustomSort();
  }
}

async function initAccountPane() {
  /* Set UI in accordance with what's in the prefs*/
  let userSort = browser.accounts.hasCustomSort();
  document.querySelector("#custom-sort").checked = userSort;
  showHideAccount();

  let accountList = document.getElementById("account-list");
  let accounts = await browser.accounts.list();
  for (let a of accounts) {
    accountList.appendChild(mkAccount(a));
  }

  /* Event handlers */
  document.querySelector("#account-move-up").addEventListener("click", function (event) {
    let li = document.querySelector(".account-entry.selected");
    if (li != li.parentNode.firstElementChild)
      li.parentNode.insertBefore(li, li.previousElementSibling);
  });

  document.querySelector("#account-move-down").addEventListener("click", function (event) {
    let li = document.querySelector(".account-entry.selected");
    if (li != li.parentNode.lastElementChild)
      li.parentNode.insertBefore(li, li.nextElementSibling.nextElementSibling);
  });

  document.querySelector("#custom-sort").addEventListener("change", showHideAccount);

  document.querySelector("#account-apply").addEventListener("click", applyAccountChanges);
}

/* Global initialization */
async function initOptions() {
  await initAccountPane();
}

document.addEventListener("DOMContentLoaded", initOptions);

console.log("done");
