// Import any needed modules.
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
const g_ThunderbirdMajorVersion = Services.appinfo.version.split(".")[0];

// Load an additional JavaScript file.
Services.scriptloader.loadSubScript("chrome://tbsortfolders/content/folderPane.js", window, "UTF-8");

function onLoad(activatedWhileWindowOpen) {
  const tbsf_prefs = Services.prefs.getBranch("extensions.tbsortfolders@xulforum.org.");
  let xulname = 'tbsortfolders';
  if (g_ThunderbirdMajorVersion >= 91) {
    xulname += '_91';
  }
  let additionalElements = `
    <menupopup id="taskPopup">
      <menuitem insertafter="activityManager" id="tbsf_menu_item"
        oncommand="window.openDialog('chrome://tbsortfolders/content/${xulname}.xhtml', 'ManuallySortFolders',
          'chrome,titlebar,toolbar,centerscreen,resizable');"
        label="&tbsf.menuentry.label;" />
    </menupopup>
    <panelview id="appMenu-toolsView">
      <toolbarseparator id="tbsf_appmenu_separator" insertafter="appmenu_addressBook" />
      <toolbarbutton insertafter="tbsf_appmenu_separator" id="tbsf_appmenu_item" class="subviewbutton subviewbutton-iconic"
      oncommand="window.openDialog('chrome://tbsortfolders/content/${xulname}.xhtml', 'ManuallySortFolders',
        'chrome,titlebar,toolbar,centerscreen,resizable');"
      label="&tbsf.menuentry.label;" />
    </panelview>`;
  if (tbsf_prefs.getStringPref("hide_folder_icons")) {
    additionalElements += `
     <vbox id="folderPaneBox">
      <html:style insertafter="folderPaneHeader">
        #folderTree > treechildren::-moz-tree-image {
         list-style-image: none;
         width: 0;
         height: 0;
        }
      </html:style>
     </vbox>`;
  }
  WL.injectElements(additionalElements, ["chrome://tbsortfolders/locale/main.dtd"]);
}

function onUnload(deactivatedWhileWindowOpen) {
}
