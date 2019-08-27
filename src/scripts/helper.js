/*! Copyright 2019 Incentive Inc. All rights reserved. */

var helper = (function () {

    /* TODO: 
     * Enter the url to your Weavy installation e.i. https://weavy.company.com */
    var _weavyUrl = "https://hq.weavycloud.com";

    /* TODO:
     * Enter the name of your product */
    var _productName = "Weavy";
    /**
    * injects the script snippet using content scripts
    * https://developer.chrome.com/extensions/content_scripts
    */
    function injectScript(tabId, code, force) {

        if (force) {
            chrome.tabs.executeScript(tabId, {
                code: code
            });
        } else {

            // NOTE: edge does not return a result from executeScript - using postMessage as a workaround
            if (isEdge()) {
                var check = "if (!document.getElementById('weavy-loader') && typeof Weavy === 'undefined') {" +
                    "browser.runtime.sendMessage({ name: 'injectScript' });" +
                    "} else {" +
                    "var root = document.getElementsByClassName('weavy-root');if (root.length > 0) { root[0].style.display = 'block'; }" +
                    "}";

                chrome.tabs.executeScript(tabId, {
                    code: check
                });
            } else {
                // NOTE: check if Weavy is injected from page or is already injected by the extension
                // document.getElementById('weavy-loader') - injected locally
                // window.weavy_options - plugin has already injected script
                chrome.tabs.executeScript(tabId, {
                    code: "var r = [document.getElementById('weavy-loader'), typeof Weavy !== 'undefined']; r"
                }, function (result) {
                    if (chrome.runtime.lastError) {
                        console.warn("Error: " + chrome.runtime.lastError.message);
                    } else {
                        if (!result[0][0] && !result[0][1]) {
                            chrome.tabs.executeScript(tabId, {
                                code: code
                            });
                        } else {
                            chrome.tabs.executeScript(tabId, {
                                code: "var root = document.getElementsByClassName('weavy-root');if (root.length > 0) { root[0].style.display = 'block'; }"
                            });
                        }
                    }
                });
            }
        }
    }

    /**
    * either adds or removes the current domain from the disabled list
    */
    function upsertDisabled(hostname) {
        var title, enable;

        chrome.storage.local.get({
            disabledDomains: []
        }, function (settings) {
            if (chrome.runtime.lastError) {
                console.warn("Error: " + chrome.runtime.lastError.message);
            } else {
                var isDisabled = _.some(settings.disabledDomains, function (blocked) {
                    return hostname === blocked;
                });

                if (isDisabled) {
                    // remove from disabled list
                    chrome.storage.local.set({ disabledDomains: _.without(settings.disabledDomains, hostname) });
                    title = null;
                    enable = true;
                } else {
                    // add to disabled list
                    settings.disabledDomains.push(hostname);
                    chrome.storage.local.set({ disabledDomains: settings.disabledDomains });
                    title = "Disabled here - click to enable";
                    enable = false;
                }

                // update all tabs on this domain
                var pattern = "*://" + hostname.addTrailing("/") + "*";

                chrome.tabs.query({ url: pattern }, function (tabs) {
                    if (chrome.runtime.lastError) {
                        console.warn("Error: " + chrome.runtime.lastError.message);
                    } else {
                        if (tabs) {
                            for (var i = 0; i < tabs.length; i++) {
                                updateIcon(enable, title, tabs[i].id);
                                enable ? show(tabs[i].id) : hide(tabs[i].id);
                            }
                        }
                    }
                });
            }
        });
    }

    /**
    * toggle enabled/disabled state of the plugin for current domain (GUI only)
    */
    function updateIcon(on, title, tabId) {
        if (on) {
            chrome.browserAction.setIcon({
                path: {
                    20: "images/logo16.png",
                    35: "images/logo32.png"
                }, tabId: tabId
            });
        } else {
            chrome.browserAction.setIcon({
                path: {
                    20: "images/logo16-disabled.png",
                    35: "images/logo32-disabled.png"
                }, tabId: tabId
            });
        }

        if (title) {
            setTitle(title, tabId);
        } else {
            setTitle("Weavy", tabId);
        }
    }

    /**
    * sets the title of the browserAction for the current tab or every tab if tabId is not specified
    */
    function setTitle(title, tabId) {
        chrome.browserAction.setTitle({
            title: title,
            tabId: tabId
        });
    }

    /**
     * hides weavy if its visible
     */
    function hide(tabId) {
        chrome.tabs.executeScript(tabId, {
            code: "var root = document.getElementsByClassName('weavy-root');if (root.length > 0) { root[0].style.display = 'none'; }"
        });
    }

    /**
     * shows weavy if it is loaded, otherwise injects the script to load it.
     */
    function show(tabId) {
        // get script from storage
        chrome.storage.local.get({
            bundle: null,
            loader: null
        }, function (settings) {
            // inject
            if (chrome.runtime.lastError) {
                console.warn("Error: " + chrome.runtime.lastError.message);
            }
            injectScript(tabId, settings.bundle + settings.loader, false);
        });
    }

    /**
     * simple check to detect Edge
    */
    function isEdge() {
        return !(/*@cc_on!@*/false || !!document.documentMode) && !!window.StyleMedia;
    }

    /**
     * super basic validation of url
     * @param {any} url
     */
    function isValidUrl(url) {
        return /^https?:\/\/.+/i.test(url);
    }

    /**
     * get weavy url
     * */
    function getWeavyUrl() {
        return _weavyUrl;
    }

    /**
     * get product name
     */
    function getProductName() {
        return _productName;
    }

    return {
        upsertDisabled: upsertDisabled,
        updateIcon: updateIcon,
        injectScript: injectScript,
        isValidUrl: isValidUrl,
        getWeavyUrl: getWeavyUrl,
        getProductName: getProductName
    };
})();
