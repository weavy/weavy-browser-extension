/*! Copyright 2018 Incentive Inc. All rights reserved. */

var windows = (function () {

    var _windows = [];

    // creates a window with the supplied parameters and adds it to the windows collection
    function create(key, url, type, width, height, top, left, force) {
        var win = getByKey(key);

        var params = {
            width: width,
            height: height,
            top: top,
            left: left
        };

        if (win !== null) {

            chrome.tabs.get(win.window.tabs[0].id, function (tab) {
                params["focused"] = true;

                if (force && tab.url !== url) {
                    // update url and focus
                    chrome.tabs.update(tab.id, { url: url });
                    chrome.windows.update(win.window.id, params, function () { });
                    return;
                } else {
                    // focus
                    chrome.windows.update(win.window.id, params, function () { });
                    return;
                }
            });

        } else {

            chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
                params["url"] = url;
                params["type"] = type;

                //if (tabs.length === 1) {
                //    params["tabId"] = tabs[0].id;
                //}
                chrome.windows.create(params, function (win) {
                    var index = _windows.map(function (m) { return m.key; }).indexOf(key);

                    if (index !== -1) {
                        _windows[index] = { key: key, window: win };
                    } else {
                        _windows.push({ key: key, window: win });
                    }
                });
            });
        }
    }

    // gets a window by it's id from the windows collection
    function getById(id) {
        for (var i = 0; i < _windows.length; i++) {
            if (_windows[i].window.id === id) {
                return _windows[i];
            }
        }
        return null;
    }

    // gets a window by it's key from the windows collection
    function getByKey(key) {
        for (var i = 0; i < _windows.length; i++) {
            if (_windows[i].key === key) {
                return _windows[i];
            }
        }
        return null;
    }

    // respond to popups being closed
    chrome.windows.onRemoved.addListener(function (id) {
        var win = getById(id);

        if (win !== null) {
            _windows.splice(_windows.indexOf(win), 1);
        }
    });

    return {
        create: create
    };

})();
