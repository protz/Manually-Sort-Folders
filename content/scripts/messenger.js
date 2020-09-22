// Import any needed modules.
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

// Load an additional JavaScript file.
Services.scriptloader.loadSubScript("chrome://tbsortfolders/content/folderPane.js", window, "UTF-8");

function onLoad(activatedWhileWindowOpen) {
  WL.injectCSS("resource://quicktext/skin/quicktext.css");
  WL.injectElements(`
    <menupopup id="taskPopup">
      <menuitem insertafter="activityManager" id="tbsf_menu_item"
        oncommand="window.openDialog('chrome://tbsortfolders/content/', '',
          'chrome,titlebar,toolbar,centerscreen');"
        label="&tbsf.menuentry.label;" />
    </menupopup>`,
  ["chrome://tbsortfolders/locale/main.dtd"]);
}

function onUnload(deactivatedWhileWindowOpen) {
}
