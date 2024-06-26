/**
 * @fileOverview Contains JavaScript for an embedded version of Helioviewer.org
 * @author <a href="mailto:keith.hughitt@nasa.gov">Keith Hughitt</a>
 */
/*jslint browser: true, white: true, onevar: true, undef: true, nomen: false, eqeqeq: true, plusplus: true,
  bitwise: true, regexp: true, strict: true, newcap: true, immed: true, maxlen: 120, sub: true */
/*global document, window, $, HelioviewerClient, TooltipHelper,
  HelioviewerViewport, KeyboardManager, Helioviewer,
  SettingsLoader, assignTouchHandlers */
"use strict";
var HelioviewerEmbeddedClient = HelioviewerClient.extend(
    /** @lends HelioviewerWebClient.prototype */
    {
    /**
     * Creates a new embedded Helioviewer.org instance.
     * @constructs
     *
     * @param {array} zoomLevels, set of float number for zoom levels.
     * @param {string} link http link for embedded client to work
     */
    init: function (zoomLevels, link) {
        var date, imageScale;

        this._super(zoomLevels);

        // Display watermark button
        if (!Helioviewer.urlSettings.hideWatermark) {
            this._showWatermark(link);
        }

        // Determine image scale to use
        imageScale = this._chooseInitialImageScale(Helioviewer.userSettings.get('state.imageScale'), zoomLevels);

        // Use URL date if specified, otherwise use current time
        if (urlSettings.date) {
            date = Date.parseUTCDate(urlSettings.date);
        } else {
            date = new Date().toUTCDate();
        }

        this.keyboard = new KeyboardManager();

        // Get available data sources and initialize viewport
        this._initViewport("body", date, 0, 0);
    },

    /**
     * Displays the Helioviewer.org watermark which includes a link to the
     * main web-site.
     *
     * @param {string} link URL for the non-embedded version of the same page.
     */
    _showWatermark: function (link) {
        var win, watermark, onResize;

        win = $(window);

        $('body').append("<a href='" + link + "'><div id='watermark'></div></a>");
        watermark = $("#watermark");

        // Scale watermark
        onResize = function (e) {
            var w = Math.min(140, Math.max(100, win.width() * 0.15)),
                h = 0.25 * w;
            watermark.width(w).height(h);
        };
        win.bind('resize', onResize);

        onResize();
        watermark.show();
    }
});
