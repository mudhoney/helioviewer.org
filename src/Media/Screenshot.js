/**
 * @description Object representing a screenshot. Handles tooltip creation for its entry in the history bar
 * @author <a href="mailto:jaclyn.r.beck@gmail.com">Jaclyn Beck</a>
 */
/*jslint browser: true, white: true, onevar: true, undef: true, nomen: false, eqeqeq: true, plusplus: true, 
bitwise: true, regexp: false, strict: true, newcap: true, immed: true, maxlen: 120, sub: true */
/*global Class, $, setTimeout, window, Media, extractLayerName, layerStringToLayerArray */
"use strict";
var Screenshot = Class.extend(
    /** @lends Screenshot.prototype */
    {
    /**
     * @constructs
     * @description Holds on to meta information 
     */    
    init: function (params, url) {
        $.extend(this, params);
        this.width  = Math.floor((this.x2 - this.x1) / this.imageScale);
        this.height = Math.floor((this.y2 - this.y1) / this.imageScale);
        this.name   = this.parseName();
        
        if (typeof url !== "undefined") {
            this.url = url;
            this.id  = url.slice(-14, -4);
        }
        this.time = this.obsDate.replace("T", " ");
        
        // Get rid of the extra .000 if there is one
        if (this.time.length > 20) {
            this.time = this.time.slice(0, -5);
        }
    },
    
    /**
     * @description Opens the download dialog
     */
    download: function () {
        if (this.url) {
            var file = this.url.match(/[\w]*\/[\w-\.]*.[jpg|png]$/).pop(); // Relative path to screenshot
            window.open('api/index.php?action=downloadFile&uri=' + file, '_parent');
        } else {
            $(document).trigger("message-console-warn", ["There was an error retrieving your " +
                                "screenshot. Please try again later or refresh the page."]);
        }
    },
    
    /**
     * Returns the screenshot identifier
     * 
     * @return {String} screenshot id
     */
    getId: function () {
        return this.id;
    },
    
    /**
     * Returns the human-readible name for the screenshot
     * 
     * @return {String} screenshot name
     */
    getName: function () {
        return this.name;
    },
    
    /**
     * Gets the difference between "now" and this object's date and 
     * returns it in "fuzzy time", i.e. "5 minutes ago" or 
     * "1 day ago"
     */
    getTimeDiff: function () {
        var now, diff;
        now = new Date();
        // Translate time diff from milliseconds to seconds
        diff = (now.getTime() - this.dateRequested) / 1000;

        return toFuzzyTime(diff) + " ago";
    },
    
    /**
     * Figures out what part of the layer name is relevant to display.
     * The layer is given as an array: {inst, det, meas}
     */
    parseLayer: function (layer) {
        if (layer[0] === "LASCO") {
            return layer[1];
        }
        return layer[2];
    },
    
    /**
     * Creates the name that will be displayed in the history.
     * Groups layers together by detector, ex: 
     * EIT 171/304, LASCO C2/C3
     * Will crop names that are too long and append ellipses.
     */
    parseName: function () {
        var rawName, layerArray, name, currentInstrument, self = this;
        
        layerArray = layerStringToLayerArray(this.layers).sort();
        name = "";
        
        currentInstrument = false;
        
        $.each(layerArray, function () {
            rawName = extractLayerName(this).slice(1);

            if (rawName[0] !== currentInstrument) {
                currentInstrument = rawName[0];
                name += ", " + currentInstrument + " ";
            } else {
                name += "/";
            }
            
            name += self.parseLayer(rawName);
        });
        
        // Get rid of the extra ", " at the front
        name = name.slice(2);
        
        // TEMP Work-Around 2011/01/07
        this.longName = name;
        
        // Shorten
        if (name.length > 16) {
            name = name.slice(0, 16) + "...";
        }
        
        return name;
    },
    
    /**
     * Puts information about the screenshot into an array for storage in UserSettings.
     */    
    serialize: function () {
        return {
            dateRequested : this.dateRequested,
            id            : this.id,
            width         : this.width,
            height        : this.height,
            imageScale    : this.imageScale,
            layers        : this.layers,
            name          : this.name,
            obsDate       : this.obsDate,
            url           : this.url,
            x1            : this.x1,
            x2            : this.x2,
            y1            : this.y1,
            y2            : this.y2
        };
    }
});
