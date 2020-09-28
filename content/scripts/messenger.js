// Import any needed modules.
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

// Load an additional JavaScript file.
Services.scriptloader.loadSubScript("chrome://tbsortfolders/content/folderPane.js", window, "UTF-8");

function onLoad(activatedWhileWindowOpen) {
  WL.injectElements(`
    <menupopup id="taskPopup">
      <menuitem insertafter="activityManager" id="tbsf_menu_item"
        oncommand="window.openDialog('chrome://tbsortfolders/content/tbsortfolders.xhtml', '',
          'chrome,titlebar,toolbar,centerscreen');"
        label="&tbsf.menuentry.label;" />
    </menupopup>
    <panelview id="appMenu-toolsView">
      <toolbarseparator id="tbsf_appmenu_separator" insertafter="appmenu_addressBook" />
      <toolbarbutton insertafter="tbsf_appmenu_separator" id="tbsf_appmenu_item" class="subviewbutton subviewbutton-iconic"
      oncommand="window.openDialog('chrome://tbsortfolders/content/tbsortfolders.xhtml', '',
        'chrome,titlebar,toolbar,centerscreen');"
      label="&tbsf.menuentry.label;" />
    </panelview>`,
    ["chrome://tbsortfolders/locale/main.dtd"]);
}

function onUnload(deactivatedWhileWindowOpen) {
}
