// Called when the user clicks on the browser action. but doesn't work if there's a popup
// chrome.browserAction.onClicked.addListener(function(tab) {
//   console.log("browserAction onClicked");
// });

function sendMsgToContentScript(msg) {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, msg, function(response) {})
  });
}

// chrome.runtime.onConnect.addListener(() => {
// })

// chrome.permissions.contains({
//     permissions: ['storage']
//   }, function(result) {
//   if (result) {
//     // notify content script
//     // sendMsgToContentScript({hasStoragePermission: true})       
//   }
// })


chrome.runtime.onMessage.addListener(function(message, sender, sendResponse){
  if (message.popupOpen) {
    // console.log('popup is open');

    sendMsgToContentScript({"message": "clicked_browser_action"})
  }

  if (message.takeScreenshot) {
  	// console.log('TODO - take a screenshot')

  	chrome.tabs.captureVisibleTab(null, {
        format : "png"
    }, function(data) {
        // screenshot.data = data;
        // console.log('screenshot data', data)

        chrome.runtime.sendMessage({screenshotCaptured: true, screenshotData: data});
    });
  }
});

