/*! Copyright 2019 Incentive Inc. All rights reserved. */

var network = (function () {

    var _legacy = false;

    // endpoints
    var CONFIGURATION_ENDPOINT = function () {
        return _legacy ? "/api/widget/config" : "/a/client/config";
    };

    var SCRIPT_ENDPOINT = function () {
        return _legacy ? "/javascript/widget.js" : "/javascript/weavy.extended.bundle.min.js";
    };

    /**
    * sync scripts from Weavy
    */
    function sync(callback) {

        console.log("syncing...");

        // check that weavy is ok or upgraded
        isWeavy(helper.getWeavyUrl(), function (weavyIsOk) {
            if (weavyIsOk) {
                // get the widget script and save it
                request(helper.getWeavyUrl() + SCRIPT_ENDPOINT() + "?v=" + chrome.runtime.getManifest().version, "GET", "application/javascript", function (script) {
                    request(helper.getWeavyUrl() + CONFIGURATION_ENDPOINT(), "GET", "application/json", function (config) {
                        if (typeof script !== "undefined" && script !== null && typeof config !== "undefined" && config !== null) {
                            config = JSON.parse(config);
                            chrome.storage.local.set({
                                loader: config.init_script,
                                bundle: script
                            });
                            console.log("sync complete");
                            callback && callback();
                        } else {
                            console.log("failed to sync scripts");
                            callback && callback && callback && callback("Could not upgrade Weavy. Please check your url.");
                        }
                    });
                });

            } else {
                callback && callback && callback("Could not connect to the Weavy installation. Please check your url.")
            }
        });
}

    /**
     * sends a request to the specified url and returns true if weavy responds, otherwise returns false
     * @param {any} url
     */
    function isWeavy(url, callback) {
    request(url.addTrailing("/") + "a/status", "GET", "application/json", function (response) {
        console.log("response was newer than v3.0:", response);
        if (response !== undefined && response !== null) {
            callback && callback(true);
        } else {
            request(url.addTrailing("/") + "api/status", "GET", "application/json", function (response) {
                console.log("response was (legacy <= v3.0):", response);
                if (response !== undefined && response !== null) {
                    _legacy = true;
                    callback && callback(true);
                } else {
                    callback && callback(false);
                }
            });
        }
    });
}

/**
* performs an XMLHttpRequest
*/
function request(url, verb, responseType, callback) {

    url = url + ((/\?/).test(url) ? "&" : "?") + "r=" + (new Date()).getTime();

    console.log(verb + " " + url);

    var xhr = new XMLHttpRequest();
    // 30 sec timeout
    xhr.timeout = 30000;

    xhr.onload = function () {
        if (xhr.status === 200) {
            var contenttype = xhr.getResponseHeader("content-type");

            if (contenttype.toLowerCase().indexOf(responseType) >= 0) {
                callback(xhr.response);
            } else {
                console.log("Incorrect content type. Expected application/json, got " + contenttype);
                callback(null);
            }
        } else if (xhr.status === 401 || xhr.status === 403) {
            callback(null);
        } else {
            callback(undefined);
        }
    };

    xhr.ontimeout = function (e) {
        callback(undefined);
    };

    xhr.onerror = function () {
        callback(undefined);
    };

    try {
        xhr.open(verb, url, true);
        xhr.send();
    } catch (e) {
        console.error("Request failed: " + e.message);
        callback(undefined);
    }
}

return {
    sync: sync,
    request: request,
    isWeavy: isWeavy
};

}) ();

// adds a trailing string if it does not exist
String.prototype.addTrailing = function (trailing) {
    return this.endsWith(trailing) ? this : this + trailing;
};
