/*! Copyright 2018 Incentive Inc. All rights reserved. */

// listen for dispatched messages from signup
window.addEventListener("message", onMessageRecieved, false);

function onMessageRecieved(e) {
    var message;

    switch (e.data.name) {
        case "setUrl":
            message = { name: "setUrl", url: e.data.url, redirect: e.data.redirect };
            break;
        case "sync":
            message = { name: "sync" };
            break;
        case "closeWindow":
            message = { name: "closeWindow" };
            break;
        case "closeOwnWindow":
            window.close();
            break;
    }

    chrome.runtime.sendMessage(message, function (response) {
        // callback
    });
}
