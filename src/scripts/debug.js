/*! Copyright 2018 Incentive Inc. All rights reserved. */

/**
* writes the content of the storage for debug purposes
*/
$(function () {

    var $container = $(".storage");

    chrome.storage.local.get(null, function (items) {
        var allKeys = Object.keys(items);

        for (var i = 0; i < allKeys.length; i++) {
            var dt = $("<dt/>");
            dt.text(allKeys[i]);
            $container.append(dt);

            var dd = $("<dd/>");
            dd.text(items[allKeys[i]]);
            $container.append(dd);
        }
    });

    $(document).on("click", "#clear", function () {
        chrome.storage.local.clear();
        document.location.reload();
    });

    $(document).on("click", "#sync", function () {
        network.sync(function (message) { });
    });

});

