/*! Copyright 2019 Incentive Inc. All rights reserved. */

/**
* Since chrome 73 there is problem accessing application/json content from cross origin - our signalr request gets blocked by CORB.
* Solved by adding access-control-allow-origin:* for our signalr requests.
* See: https://bugs.chromium.org/p/chromium/issues/detail?id=933893, https://www.chromestatus.com/feature/5629709824032768, https://stackoverflow.com/questions/54786635/how-to-avoid-cross-origin-read-blockingcorb-in-a-chrome-web-extension
*/
chrome.webRequest.onHeadersReceived.addListener(details => {
    var wUrl = helper.getWeavyUrl();

    var headers = details.responseHeaders;

    var hasUrl = wUrl !== null;

    var isSignalR = hasUrl && details.url.startsWith(wUrl.addTrailing("/") + "signalr/");
    var isDoc = hasUrl && details.type === "main_frame";
    var docCSP = headers.find(header => header.name.toLowerCase() === "content-security-policy");

    if (isDoc && docCSP) {
        var policys = docCSP.value.split("; ");
        var pUrl = wUrl.match(/^https?:\/\/(.+)(?:\/|$)/)[1];

        docCSP.value = policys.map(policy => {
            if (/^(connect-src|frame-src|img-src|media-src|script-src|style-src)/.test(policy)) {
                policy = policy.split("'none'").join('').trim();
                policy += " " + pUrl;
            }
            return policy;
        }).join("; ")
    }

    if (isSignalR) {
        headers = headers.filter(item => item.name.toLowerCase() !== "access-control-allow-origin");
        headers.push({ name: "Access-Control-Allow-Origin", value: "*" });
    }
    return { responseHeaders: headers };
}, { urls: ["<all_urls>"] }, ["blocking", "extraHeaders", "responseHeaders"]);

/**
* listens to clicks on the browseraction icon
* https://developer.chrome.com/extensions/browserAction
*/
chrome.browserAction.onClicked.addListener((tab) => {
    // removes / adds current domain to disabled list
    var hostname = new URL(tab.url).hostname.toLowerCase();
    helper.upsertDisabled(hostname);
});

/**
* responds to messages from other windows
* https://developer.chrome.com/apps/runtime
* https://developer.chrome.com/apps/messaging
*/
chrome.runtime.onMessage.addListener(
    function (message, sender, sendResponse) {
        switch (message.name) {
            case "hello":
                sendResponse({ farewell: "goodbye" });
                break;
            case "setUrl":
                if (helper.isValidUrl(message.url)) {
                    // save url
                    chrome.storage.local.set({ url: message.url }, function () {
                        // sync
                        network.sync(function () {
                            if (message.redirect) {
                                chrome.tabs.create({ url: message.redirect }, function () { });
                                chrome.windows.remove(sender.tab.windowId);
                            }
                        });
                    });
                }
                break;
            case "sync":
                network.sync(function () {
                    sendResponse("");
                });
                break;
            case "closeWindow":
                // close opened window
                chrome.windows.remove(sender.tab.windowId);
                break;
            case "fallback":
                windows.create(message.key, message.url, "popup", message.width, message.height, message.top, message.left, message.force);
                break;
            case "injectScript":
                // called from content script to add the widget script in Edge
                chrome.storage.local.get({
                    url: null,
                    disabledDomains: [],
                    bundle: null,
                    loader: null
                }, function (settings) {
                    chrome.tabs.query({ currentWindow: true, active: true }, function (tab) {
                        helper.injectScript(tab.id, settings.bundle + settings.loader, true);
                    });
                });
                break;
        }
    }
);

/**
* disable the browser action while loading, enable it when page is loaded if applicable
* https://developer.chrome.com/extensions/webNavigation
*/
chrome.webNavigation.onBeforeNavigate.addListener(function (e) {

    chrome.tabs.get(e.tabId, function (tab) {
        if (chrome.runtime.lastError) {
            console.warn("Error: " + chrome.runtime.lastError.message);
        } else {
            // we only want to catch the main request
            if (e.url === tab.url) {

                chrome.storage.local.get({
                    url: null
                }, function (settings) {
                    if (settings.url && settings.url.length > 0) {
                        // disable plugin icon while loading
                        helper.updateIcon(false, "", e.id);
                    }
                });
            }
        }
    });
});

/**
* last step in the event flow of a successfull page load
* injects the Weavy script if applicable
* https://developer.chrome.com/extensions/webNavigation
*/
chrome.webNavigation.onDOMContentLoaded.addListener(function (e) {

    chrome.tabs.get(e.tabId, function (tab) {

        // we only want to catch the main request
        if (tab && tab.url && e.url === tab.url) {

            // skip for local pages and Chrome web store
            if (e.url.startsWith("chrome") || e.url.startsWith("https://chrome.google.com/webstore/") || e.url.startsWith("file:///")) {
                helper.updateIcon(false, "Not available", e.tabId);
                return;
            }

            chrome.windows.get(tab.windowId, function (window) {
                // skip if type of window popup etc.
                if (window.type !== "normal") {
                    helper.updateIcon(false, "Not available", e.tabId);
                    return;
                }

                chrome.storage.local.get({
                    url: null,
                    disabledDomains: [],
                    bundle: null,
                    loader: null
                }, function (settings) {
                    if (chrome.runtime.lastError) {
                        console.warn("Error: " + chrome.runtime.lastError.message);
                    } else {
                        // enable button
                        helper.updateIcon(true, helper.getProductName(), tab.id);

                        // exit - not configured
                        if (helper.getWeavyUrl().length === 0) {
                            console.log("No url configured - exiting");
                            return;
                        }

                        // exit if extension has no data from installation
                        if (!settings.bundle || !settings.loader) {
                            console.log("Missing script, starting sync");
                            helper.updateIcon(false, "Syncing...", tab.id);
                            network.sync();
                            return;
                        }

                        var uri = new URL(tab.url);
                        var host = uri.hostname.toLowerCase();

                        // exit - we're in weavy standalone
                        if (uri.origin.addTrailing("/") === helper.getWeavyUrl().addTrailing("/")) {
                            return;
                        }

                        var isDisabled = _.some(settings.disabledDomains, function (blocked) {
                            return host === blocked;
                        });

                        // exit if domain is disabled
                        if (isDisabled) {
                            helper.updateIcon(false, "Disabled here - click to enable", tab.id);
                            return;
                        } else {
                            helper.updateIcon(true, helper.getProductName(), tab.id);
                        }

                        // Weavy should be loaded - inject script snippet
                        helper.injectScript(tab.id, settings.bundle + settings.loader, false);
                    }
                });
            });
        }
    });
});