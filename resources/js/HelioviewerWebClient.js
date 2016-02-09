/**
 * @fileOverview Contains the main application class and controller for Helioviewer.
 * @author <a href="mailto:jeff.stys@nasa.gov">Jeff Stys</a>
 * @author <a href="mailto:keith.hughitt@nasa.gov">Keith Hughitt</a>
 */
/*jslint browser: true, white: true, onevar: true, undef: true, nomen: false, eqeqeq: true, plusplus: true,
  bitwise: true, regexp: true, strict: true, newcap: true, immed: true, maxlen: 120, sub: true */
/*global document, window, $, HelioviewerClient, ImageSelectTool, MovieBuilder,
  TooltipHelper, HelioviewerViewport, ScreenshotBuilder, ScreenshotHistory,
  MovieHistory, UserVideoGallery, MessageConsole, Helioviewer,
  KeyboardManager, SettingsLoader, TimeControls,
  ZoomControls, ScreenshotManagerUI, MovieManagerUI, assignTouchHandlers,
  TileLayerAccordion, VisualGlossary, _gaq */
"use strict";
var HelioviewerWebClient = HelioviewerClient.extend(
    /** @lends HelioviewerWebClient.prototype */
    {
    /**
     * Creates a new Helioviewer.org instance.
     * @constructs
     *
     * @param {Object} urlSettings Client-specified settings to load.
     *  Includes imageLayers, date, and imageScale. May be empty.
     * @param {Object} serverSettings Server settings loaded from Config.ini
     */
    init: function (urlSettings, serverSettings, zoomLevels) {
        var urlDate, imageScale, paddingHeight, accordionsToOpen, self=this;

        this.header                    = $('#hv-header');
        this.viewport                  = $('#helioviewer-viewport');
        this.drawerSpeed               = 0;
        this.drawerLeft                = $('#hv-drawer-left');
        this.drawerLeftOpened          = false;
        this.drawerLeftOpenedWidth     = 25;    /* em */
        this.drawerLeftTab             = $('#hv-drawer-tab-left');
        this.drawerLeftTabLeft         = -2.6; /* em */
        this.drawerLeftTabBorderRight  = "2pt solid rgba(0,0,0,1)";
        this.drawerLeftTabBorderBottom = "2pt solid rgba(0,0,0,1)";
        this.drawerTimeline            = $('#hv-drawer-timeline');
        this.drawerTimelineTab         = $('#hv-drawer-tab-timeline');
        this.drawerTimelineOpened      = false;
        this.drawerTimelineOpenedHeight= '326';
        this.drawerNews                = $('#hv-drawer-news');
        this.drawerNewsOpened          = false;
        this.drawerNewsOpenedHeight    = 'auto';
        this.drawerNewsOpenedWidth     = '25em';
        this.drawerMovies              = $('#hv-drawer-movies');
        this.drawerMoviesOpened        = false;
        this.drawerMoviesOpenedHeight  = 'auto';
        this.drawerMoviesOpenedWidth   = '25em';
        this.drawerScreenshots             = $('#hv-drawer-screenshots');
        this.drawerScreenshotsOpened       = false;
        this.drawerScreenshotsOpenedHeight = 'auto';
        this.drawerScreenshotsOpenedWidth  = '25em';
        this.drawerYoutube             = $('#hv-drawer-youtube');
        this.drawerYoutubeOpened       = false;
        this.drawerYoutubeOpenedHeight = 'auto';
        this.drawerYoutubeOpenedWidth  = '25em';
        this.drawerData                = $('#hv-drawer-data');
        this.drawerDataOpened          = false;
        this.drawerDataOpenedHeight    = 'auto';
        this.drawerDataOpenedWidth     = '25em';
        this.drawerShare               = $('#hv-drawer-share');
        this.drawerShareOpened         = false;
        this.drawerShareOpenedHeight   = 'auto';
        this.drawerShareOpenedWidth    = '25em';
        this.drawerHelp                = $('#hv-drawer-help');
        this.drawerHelpOpened          = false;
        this.drawerHelpOpenedHeight    = 'auto';
        this.drawerHelpOpenedWidth     = '25em';
        

        this.tabbedDrawers = ['#hv-drawer-news', '#hv-drawer-movies',
                              '#hv-drawer-screenshots', '#hv-drawer-youtube',
                              '#hv-drawer-data', '#hv-drawer-share',
                              '#hv-drawer-help'];
        this.tabbedDrawerButtons = {
            '#hv-drawer-news'        : '#news-button',
            '#hv-drawer-youtube'     : '#youtube-button',
            '#hv-drawer-movies'      : '#movies-button',
            '#hv-drawer-screenshots' : '#screenshots-button',
            '#hv-drawer-data'        : '#data-button',
            '#hv-drawer-share'       : '#share-button',
            '#hv-drawer-help'        : '#help-button'};

        this._super(urlSettings, serverSettings, zoomLevels);

        // Debugging helpers
        if (urlSettings.debug) {
            this._showDebugHelpers();
        }

        this._initLoadingIndicator();
        this._initTooltips();

        // Determine image scale to use
        imageScale = this._chooseInitialImageScale(Helioviewer.userSettings.get('state.imageScale'), zoomLevels);

        // Use URL date if specified
        urlDate = urlSettings.date ? Date.parseUTCDate(urlSettings.date) : false;

        this.timeControls = new TimeControls('#date', '#time',
            '#timestep-select', '#timeBackBtn', '#timeForwardBtn', urlDate);

        // Get available data sources and initialize viewport
        this._initViewport(this.timeControls.getDate(), 0, 0);

        this.messageConsole = new MessageConsole();
        this.keyboard       = new KeyboardManager();

        // User Interface components
        this.zoomControls   = new ZoomControls('#zoomControls', imageScale,
            zoomLevels, this.serverSettings.minImageScale,
            this.serverSettings.maxImageScale);

        this.earthScale = new ImageScale();

        this.displayBlogFeed(8, false);

        this._userVideos = new UserVideoGallery(this.serverSettings.videoFeed);

        this.imageSelectTool = new ImageSelectTool();

        this._screenshotManagerUI = new ScreenshotManagerUI();
        this._movieManagerUI      = new MovieManagerUI();

        this._glossary = new VisualGlossary(this._setupDialog);

        this._setupDialogs();
        this._initEventHandlers();
        this._setupSettingsUI();

        this._displayGreeting();
		
        $('#mouse-cartesian').click();

        this.drawerUserSettings = Helioviewer.userSettings.get("state.drawers");
        $.each(this.drawerUserSettings, function(drawerSelector, drawerObj) {
            switch(drawerSelector) {
            case "#hv-drawer-left":
                if ( drawerObj.open ) {
                    self.drawerLeftClick(true);
                }
                break;
            case "#hv-drawer-timeline":
                if ( drawerObj.open ) {
                    self.drawerTimelineClick(true);
                }
                break;
            case "#hv-drawer-news":
                if ( drawerObj.open ) {
                    self.drawerNewsClick(true);
                }
                break;
            case "#hv-drawer-youtube":
                if ( drawerObj.open ) {
                    self.drawerYoutubeClick(true);
                }
                break;
            case "#hv-drawer-movies":
                if ( drawerObj.open ) {
                    self.drawerMoviesClick(true);
                }
                break;
            case "#hv-drawer-screenshots":
                if ( drawerObj.open ) {
                    self.drawerScreenshotsClick(true);
                }
                break;
            case "#hv-drawer-data":
                if ( drawerObj.open ) {
                    self.drawerDataClick(true);
                }
                break;
            case "#hv-drawer-share":
                if ( drawerObj.open ) {
                    self.drawerShareClick(true);
                }
                break;
            case "#hv-drawer-help":
                if ( drawerObj.open ) {
                    self.drawerHelpClick(true);
                }
                break;
            default:
                console.info(['no drawer: ', drawerSelector, obj]);
            }
        });
        
        this.updateHeightsInsideViewportContainer();
        
    },

    /**
     * @description Sets up a simple AJAX-request loading indicator
     */
    _initLoadingIndicator: function () {
        $(document).ajaxStart(function () {
            $('#loading').show();
        })
        .ajaxStop(function () {
            $('#loading').hide();
        });
    },

    /**
     * Add tooltips to static HTML buttons and elements
     */
    _initTooltips: function () {
        // Overide qTip defaults
        $.fn.qtip.defaults = $.extend(true, {}, $.fn.qtip.defaults, {
            show: {
                delay: 1000
            },
            style: {
                classes:'ui-tooltip-light ui-tooltip-shadow ui-tooltip-rounded'
            }
        });

        // Bottom-right tooltips
        $("*[title]:not(.qtip-left)").qtip();

        // Bottom-left tooltips
        $(".qtip-left").qtip({
            position: {
                my: "top right",
                at: "bottom middle"
            }
        });

        // Top-left tooltips
        $(".qtip-topleft").qtip({
            position: {
                my: "bottom right",
                at: "top middle"
            }
        });
    },

    /**
     * Initializes the viewport
     */
    _initViewport: function (date, marginTop, marginBottom) {
        var self = this;

        $(document).bind("datasources-initialized", function (e, dataSources) {
            var tileLayerAccordion = new TileLayerAccordion(
                    '#tileLayerAccordion', dataSources, date);
        });

        $(document).bind("event-types-initialized",
            function (e, eventTypes, date) {
                var eventLayerAccordion = new EventLayerAccordion(
                        '#eventLayerAccordion', eventTypes, date);
        });

        this._super("#helioviewer-viewport-container-outer", date,
            marginTop, marginBottom);
    },

    /**
     * Adds a movie to the user's history and displays the movie
     *
     * @param string movieId Identifier of the movie to be shown
     */
    loadMovie: function (movieId) {
        if ( !this._movieManagerUI.has(movieId) ) {
            this._movieManagerUI.addMovieUsingId(movieId);
        }
        else {
            this._movieManagerUI.playMovie(movieId);
        }
    },

    /**
     * @description Sets up event-handlers for dialog components
     */
    _setupDialogs: function () {
        var self = this;

        // About dialog
        this._setupDialog("#helioviewer-about", "#about-dialog", {
            "title"  : "Helioviewer - About",
            "height" : 400
        });

        // Keyboard shortcuts dialog
        this._setupDialog("#help-links-shortcuts", "#usage-dialog", {
            "title": "Helioviewer - Usage Tips"
        });

        // Settings dialog
        this._setupDialog("#settings-button", "#settings-dialog", {
            "buttons": {
                "Ok": function () {
                    $(this).dialog("close");
                }
            },
            "title": "Helioviewer - Settings",
            "width": 400,
            "height": 'auto',
            "resizable": false,
            "create": function (e) {

            }
        });
    },

    /**
     * Sets up event handlers for a single dialog
     */
    _setupDialog: function (btn, dialog, options, onLoad) {
        // Default options
        var defaults = {
            title     : "Helioviewer.org",
            autoOpen  : true,
            draggable : true,
            width     : 480,
            height    : 400
        };

        // Button click handler
        $(btn).on('click', function () {
            var d   = $(dialog),
                btn = $(this);

            if (btn.hasClass("dialog-loaded")) {
                if (d.dialog('isOpen')) {
                    d.dialog('close');
                }
                else {
                    d.dialog('open');
                }
            } else {
	            var url = $(this).attr('rel');
                d.load(url, onLoad).dialog($.extend(defaults, options));
                btn.addClass("dialog-loaded");
            }
            return false;
        });
    },

    /**
     * Enables some debugging helpers that display extra information to help
     * during development
     */
    _showDebugHelpers: function () {
        var dimensions, win = $(window);

        dimensions = $("<div id='debug-dimensions'></div>").appendTo("body");

        win.resize(function (e) {
            dimensions.html(win.width() + "x" + win.height());
        });
    },

    /**
     * Configures the user settings form to match the stored values and
     * initializes event-handlers
     */
    _setupSettingsUI: function () {
        var form, dateLatest, datePrevious, autorefresh, self = this;

        form         = $("#helioviewer-settings");
        dateLatest   = $("#settings-date-latest");
        datePrevious = $("#settings-date-previous");
        autorefresh  = $("#settings-latest-image");

        // Starting date
        if (Helioviewer.userSettings.get("options.date") === "latest") {
            dateLatest.attr("checked", "checked");
        } else {
            datePrevious.attr("checked", "checked");
        }

        // Auto-refresh
        if (Helioviewer.userSettings.get("options.autorefresh")) {
            autorefresh.attr("checked", "checked");
            this.timeControls.enableAutoRefresh();
        } else {
            autorefresh.removeAttr("checked");
            this.timeControls.disableAutoRefresh();
        }

        // Event-handlers
        dateLatest.change(function (e) {
            Helioviewer.userSettings.set("options.date", "latest");
        });
        datePrevious.change(function (e) {
            Helioviewer.userSettings.set("options.date", "previous");
        });
        autorefresh.change(function (e) {
            Helioviewer.userSettings.set(
                "options.autorefresh", e.target.checked);
            if (e.target.checked) {
                self.timeControls.enableAutoRefresh();
            }
            else {
                self.timeControls.disableAutoRefresh();
            }
        });

    },

    /**
     * @description Initialize event-handlers for UI components controlled by the Helioviewer class
     */
    _initEventHandlers: function () {
        var self = this,
            msg  = "Link directly to the current state of Helioviewer:",
            btns;


        $(document).on('update-external-datasource-integration', $.proxy(this.updateExternalDataSourceIntegration, this));

        $('#accordion-vso input[type=text]').bind('change', $.proxy(this.updateExternalDataSourceIntegration, this));

        $('#sdo-start-date, #sdo-start-time, #sdo-end-date, #sdo-end-time').bind('change', $.proxy(this.updateExternalDataSourceIntegration, this));

        $('#sdo-center-x, #sdo-center-y, #sdo-width, #sdo-height').bind('change', function () {

            if ( $('#sdo-full-viewport').hasClass('selected') ) {
                $('#sdo-full-viewport').removeClass('selected');
                $('#sdo-select-area').addClass('selected');
            }
            self.updateExternalDataSourceIntegration();
        });


        $(this.drawerLeftTab).bind('click', $.proxy(this.drawerLeftClick, this));
        this.drawerLeft.bind('mouseover', function (event) { event.stopPropagation(); });
        
        $(this.drawerTimelineTab).bind('click', $.proxy(this.drawerTimelineClick, this));
        this.drawerTimeline.bind('mouseover', function (event) { event.stopPropagation(); });

        $('#news-button').bind('click', $.proxy(this.drawerNewsClick, this));
        $('#youtube-button').bind('click', $.proxy(this.drawerYoutubeClick, this));
        $('#movies-button').bind('click', $.proxy(this.drawerMoviesClick, this));
        $('#screenshots-button').bind('click', $.proxy(this.drawerScreenshotsClick, this));
        $('#data-button').bind('click', $.proxy(this.drawerDataClick, this));
        $('#share-button').bind('click', $.proxy(this.drawerShareClick, this));
        $('#help-button').bind('click', $.proxy(this.drawerHelpClick, this));

        $('.drawer-contents .header').bind('click', $.proxy(this.accordionHeaderClick, this));

		$(document).bind("updateHeightsInsideViewportContainer", $.proxy(this.updateHeightsInsideViewportContainer, this));

        $('#share-button').click(function (e) {
            // Google analytics event
            if (typeof(_gaq) !== "undefined") {
                _gaq.push(['_trackEvent', 'Shares', 'Homepage - URL']);
            }
            self.displayURL(self.toURL(), msg);
        });
		setTimeout(function(){ self.displayURL(self.toURL(), msg); }, 100);

        // Highlight both text and icons for text buttons

        btns = $("#social-buttons .text-btn, " +
                 "#movie-manager-container .text-btn, " +
                 "#image-area-select-buttons > .text-btn, " +
                 "#screenshot-manager-container .text-btn, " +
                 "#event-container .text-btn");
        btns.live("mouseover",
            function () {
                $(this).find(".ui-icon").addClass("ui-icon-hover");
            });
        btns.live("mouseout",
            function () {
                $(this).find(".ui-icon").removeClass("ui-icon-hover");
            });

        // Fix drag and drop for mobile browsers
        $("#helioviewer-viewport, .ui-slider-handle").each(function () {
            assignTouchHandlers(this);
        });

        $(".helioviewer-url-shorten").on('click', function (e) {
            var url;

            if (e.target.checked) {
                url = $(".helioviewer-short-url").attr("value");
            }
            else {
                url = $(".helioviewer-long-url").attr("value");
            }

            $(".helioviewer-url-input-box").attr('value', url).select();
        });
		
		
		// Email Link
		$('#share-email-link').on('click', function(e){
			var subject = 'Helioviewer.org - Solar and heliospheric image visualization tool';
			var link = encodeURIComponent(self.toURL());
			window.location.href = "mailto:?subject="+subject+"&body=\r\n\r\n"+link;
		});
		
		// Copy Link to Clipboard
		$('#share-copy-link').on('click', function(e){
			document.execCommand('copy');
		});
		var isIe = (navigator.userAgent.toLowerCase().indexOf("msie") != -1 || navigator.userAgent.toLowerCase().indexOf("trident") != -1);
		document.addEventListener('copy', function(e) {
			var textToPutOnClipboard = self.toURL();
		    if (isIe) {
		        window.clipboardData.setData('Text', textToPutOnClipboard);    
		    } else {
		        e.clipboardData.setData('text/plain', textToPutOnClipboard);
		    }

	        // Options for the jGrowl notification
	        var jGrowlOpts = {
	            sticky: true,
	            header: "Just now"
	        };

			// Create the jGrowl notification.
        	$(document).trigger("message-console-log", ["Link successfully copied to clipboard.", jGrowlOpts, true, true]);
		    e.preventDefault();
		});
		
		
        $('#share-twitter-link').on('click', $.proxy(this.twitter, this));
        $('#share-facebook-link').on('click', $.proxy(this.facebook, this));
        $('#share-google-link').on('click', $.proxy(this.google, this));
        $('#share-pinterest-link').on('click', $.proxy(this.pinterest, this));
		//Help Links
		//Guide
		$('#help-links-guide').on('click', function(){
			window.open('http://wiki.helioviewer.org/wiki/Helioviewer.org_User_Guide_2.4.0','_blank');
		});
		
		//Glossary
		$('#help-links-glossary').on('click', function(){
			//http://helioviewer.org/dialogs/glossary.html
		});
		
		//Shortcuts
		$('#help-links-shortcuts').on('click', function(){
			//http://helioviewer.org/dialogs/usage.php
		});
		
		//Documentation
		$('#help-links-documentation').on('click', function(){
			window.open('http://wiki.helioviewer.org/wiki/Main_Page','_blank');
		});
		
		//API Documentation
		$('#help-links-api-documentation').on('click', function(){
			window.open(Helioviewer.api + '/docs/v2','_blank');
		});
		
        $('#mouse-cartesian').click( function (event) {
            var buttonPolar     = $('#mouse-polar');
            var buttonCartesian = $('#mouse-cartesian');

            if ( buttonCartesian.hasClass("active") ) {
                $('#mouse-coords').hide();
                buttonCartesian.removeClass("active");
                buttonPolar.removeClass("active");
            }
            else {
                $(document).trigger('cartesian-mouse-coords');
                buttonCartesian.addClass("active");
                buttonPolar.removeClass("active");
            }
        });
        $('#mouse-polar').click(function () {
            var buttonPolar     = $('#mouse-polar');
            var buttonCartesian = $('#mouse-cartesian');

            if ( buttonPolar.hasClass("active") ) {
                $('#mouse-coords').hide();
                buttonPolar.removeClass("active");
                buttonCartesian.removeClass("active");
            }
            else {
                $(document).trigger('polar-mouse-coords');
                buttonPolar.addClass("active");
                buttonCartesian.removeClass("active");
            }
        });

        $('#sdo-full-viewport').click(function () {
            $('#sdo-select-area').removeClass('selected');
            $('#sdo-full-viewport').addClass('selected');
            $(document).trigger('update-external-datasource-integration');
        });

        $('#sdo-select-area').click(function () {
            self._cleanupFunctions = [];

            $('#sdo-full-viewport').removeClass('selected');
            $('#sdo-select-area').addClass('selected');

            if ( helioviewer.drawerLeftOpened ) {
                self._cleanupFunctions.push('helioviewer.drawerLeftClick()');
                helioviewer.drawerLeftClick();
            }
            if ( $('#earth-button').hasClass('active') ) {
                self._cleanupFunctions.push("$('#earth-button').click()");
                $('#earth-button').click();
            }

            self._cleanupFunctions.push('helioviewer.drawerDataClick()');
            helioviewer.drawerDataClick();

            $(document).trigger("enable-select-tool",
                                [$.proxy(self._updateSDOroi, self),
                                 $.proxy(self._cleanup, self)]);
        });
    },


    /**
     * Units of 'roi' parameter is Viewport pixels wrt solar center.
     */
    _updateSDOroi: function (roi) {
        var x0=0, y0=0, width=0, height=0, vport, imageScale;

        if (typeof roi === "undefined") {
            roi = helioviewer.getViewportRegionOfInterest();
        }

        // Make sure selection region and number of layers are acceptible
        if ( !this._validateRequest(roi) ) {
            return false;
        }

        vport = this.viewport.getViewportInformation();

        // Arc seconds per pixel
        imageScale = vport['imageScale'];


        x0 = imageScale * (roi.left + roi.right) / 2;
        y0 = imageScale * (roi.bottom + roi.top) / 2;
        width  = ( roi.right - roi.left ) * imageScale;
        height = ( roi.bottom - roi.top ) * imageScale;

        $('#sdo-center-x').val(   x0.toFixed(2) );
        $('#sdo-center-y').val(   y0.toFixed(2) );
        $('#sdo-width').val(   width.toFixed(2) );
        $('#sdo-height').val( height.toFixed(2) );

    },


    /**
     *
     */
    updateSDOaccordion: function (sdoPreviews, sdoButtons, imageAccordions, imageScale) {

        var vport, imageScale,
            sDate = $('#sdo-start-date').val(),
            sTime = $('#sdo-start-time').val(),
            eDate = $('#sdo-end-date').val(),
            eTime = $('#sdo-end-time').val();

        // Wipe the slate clean
        this._clearSDOaccordion(sdoPreviews, sdoButtons);

        this._setSDOtimes(sDate, sTime, eDate, eTime);

        if ( $('#sdo-full-viewport').hasClass('selected') ) {
            vport = this.viewport.getViewportInformation();

            this._updateSDOroi({
                  'left': vport['coordinates']['left'],
                 'right': vport['coordinates']['right'],
                   'top': vport['coordinates']['top'],
                'bottom': vport['coordinates']['bottom']
            });
        }

        this.setSDOthumbnails(sdoPreviews, imageAccordions, imageScale);
        this.setSDOscriptDownloadButtons(imageAccordions, imageScale);
    },

    _clearSDOaccordion: function (sdoPreviews, sdoButtons) {
        sdoPreviews.html('');
        $.each( sdoButtons.children(), function (i, button) {
            button = $(button);
            button.removeAttr('href');
            button.unbind('click');
            button.addClass('inactive');
        });

        $('#sdo-full-viewport').addClass('inactive');
        $('#sdo-select-area').addClass('inactive');

        $.each($('#accordion-sdo').find('.label, .suffix'), function (i,text) {
            $(text).addClass('inactive');
        });
        $.each($('#accordion-sdo').find('input'), function (i,node) {
            $(node).attr('disabled', true);
        });
    },

    _clearVSOaccordion: function (vsoLinks, vsoPreviews, vsoButtons) {
        vsoLinks.html('');
        vsoPreviews.html('');
        $.each( vsoButtons.children(), function (i, button) {
            button = $(button);
            button.removeAttr('href');
            button.unbind('click');
            button.addClass('inactive');
        });

        $.each($('#accordion-vso').find('.label, .suffix'), function (i,text) {
            $(text).addClass('inactive');
        });
        $.each($('#accordion-vso').find('input'), function (i,node) {
            $(node).attr('disabled', true);
        });
    },



    /**
     * Validates the request and returns false if any of the requirements are
     * not met.
     */
    _validateRequest: function (roi) {
        var layers, sourceIDsVisible = Array(), message;

        layers = Helioviewer.userSettings.get("state.tileLayers");
        $.each( layers, function(i, layer) {
            if ( layer.visible && layer.opacity >= 5 ) {
                sourceIDsVisible.push(layer.sourceId);
            }
        });

        // Verify that 1 to [maxTileLayers] layers are visible
        if (sourceIDsVisible.length > this.viewport.maxTileLayers) {
            message = "Please hide/remove layers until there are no more "
                    + "than " + this.viewport.maxTileLayers
                    + " layers visible.";
            $(document).trigger("message-console-warn", [message,
                { "sticky": false, "header": 'Just now', "life": 5000 },
                true, true]);
            return false;
        }
        // else if ( sourceIDsVisible.length == 0) {
        //     message = "You must have at least one visible image layer. "
        //             + "Please try again.";
        //     $(document).trigger("message-console-warn", [message,
        //         { "sticky": false, "header": 'Just now', "life": 2000 },
        //         true, true]);
        //     return false;
        // }

        // Verify that the selected area is not too small
        if ( roi.bottom - roi.top < 20 || roi.right - roi.left < 20 ) {
            message = "The area you have selected is too small. "
                    + "Please try again.";
            $(document).trigger("message-console-warn", [message,
                { "sticky": false, "header": 'Just now', "life": 5000 },
                true, true]);
            return false;
        }

        return true;
    },


    _vsoLink: function (startDate, endDate, nickname) {
        var url, html;

        url  = 'http://virtualsolar.org/cgi-bin/vsoui.pl'
             + '?startyear='   + startDate.split('/')[0]
             + '&startmonth='  + startDate.split('/')[1]
             + '&startday='    + startDate.split('/')[2].split('T')[0]
             + '&starthour='   + startDate.split('T')[1].split(':')[0]
             + '&startminute=' + startDate.split('T')[1].split(':')[1]
             + '&endyear='     + endDate.split('/')[0]
             + '&endmonth='    + endDate.split('/')[1]
             + '&endday='      + endDate.split('/')[2].split('T')[0]
             + '&endhour='     + endDate.split('T')[1].split(':')[0]
             + '&endminute='   + endDate.split('T')[1].split(':')[1]
             + '&instrument='  + nickname.split(' ')[0];
        if ( parseInt(nickname.split(' ')[1], 10) ) {
            url += '&wave='     + 'other'
                +  '&wavemin='  + nickname.split(' ')[1]
                +  '&wavemax='  + nickname.split(' ')[1]
                +  '&waveunit=' + 'Angstrom';
        }

        html = '<a href="' + url + '" target="_blank">'
             + nickname + ' ' + date
             + ' UTC <i class="fa fa-external-link-square fa-fw"></i></a>';

        return html;
    },


    _vsoThumbnail: function (startDate, endDate, nickname, sourceId) {
        var hardcodedScale = '10', html;

        if ( nickname.toUpperCase() == 'LASCO C2' ) {
            hardcodedScale = '50';
        }
        else if ( nickname.toUpperCase() == 'LASCO C3' ) {
            hardcodedScale = '250';
        }
        else if ( nickname.toUpperCase() == 'COR1-A' ) {
            hardcodedScale = '35';
        }
        else if ( nickname.toUpperCase() == 'COR1-B' ) {
            hardcodedScale = '35';
        }
        else if ( nickname.toUpperCase() == 'COR2-A' ) {
            hardcodedScale = '130';
        }
        else if ( nickname.toUpperCase() == 'COR2-B' ) {
            hardcodedScale = '130';
        }

        html = '<div class="header">'
             +     nickname
             + '</div>'
             + '<div class="previews">'
             +     '<img src="' + Helioviewer.api + '?action=takeScreenshot'
             + '&imageScale=' + hardcodedScale
             + '&layers=['   + sourceId + ',1,100]'
             + '&events=&eventLabels=false'
             + '&scale=false&scaleType=earth&scaleX=0&scaleY=0'
             + '&date='      + startDate
             + '&x0=0&y0=0&width=256&height=256&display=true&watermark=false" class="preview start" /> '
             +     '<img src="' + Helioviewer.api + '?action=takeScreenshot'
             + '&imageScale=' + hardcodedScale
             + '&layers=['   + sourceId + ',1,100]'
             + '&events=&eventLabels=false'
             + '&scale=false&scaleType=earth&scaleX=0&scaleY=0'
             + '&date='      + endDate
             + '&x0=0&y0=0&width=256&height=256&display=true&watermark=false" class="preview end" /> '
             + '</div>';

        return html;
    },


    updateVSOaccordion: function (vsoLinks, vsoPreviews, vsoButtons, imageAccordions, imageScale) {

        var nickname, startDate, endDate, sourceId,
            sourceIDs = Array(), instruments = Array(), waves = Array(),
            sDate = $('#vso-start-date').val(),
            sTime = $('#vso-start-time').val(),
            eDate = $('#vso-end-date').val(),
            eTime = $('#vso-end-time').val(),
            self = this;

        // Wipe the slate clean
        this._clearVSOaccordion(vsoLinks, vsoPreviews, vsoButtons);

        this._setVSOtimes(sDate, sTime, eDate, eTime);

        $.each( imageAccordions, function(i, accordion) {

            if ( !$(accordion).find('.visible').hasClass('hidden') ) {
                nickname = $(accordion).find('.tile-accordion-header-left').html();
                sourceId = $(accordion).find('.tile-accordion-header-left').attr('data-sourceid');
                var date     = $(accordion).find('.timestamp').html();

                startDate = $('#vso-start-date').val() + 'T'
                          + $('#vso-start-time').val() + 'Z';
                endDate   = $('#vso-end-date').val()   + 'T'
                          + $('#vso-end-time').val()   + 'Z';

                sourceIDs.push(sourceId);
                instruments.push(nickname.split(' ')[0]);
                if ( parseInt(nickname.split(' ')[1], 10) ) {
                    waves.push(parseInt(nickname.split(' ')[1], 10));
                }

                vsoLinks.append(
                    self._vsoLink(startDate, endDate, nickname)
                );
                vsoPreviews.append(
                    self._vsoThumbnail(startDate, endDate, nickname, sourceId)
                );
            }
        });

        if ( sourceIDs.length > 0 ) {
            this._updateVSObuttons(startDate, endDate, sourceIDs, instruments, waves);
        }
    },


    _updateVSObuttons: function (startDate, endDate, sourceIDs, instruments, waves) {

        var x1=0, y1=0, x2=0, y2=0, url, body, imageScale,
            vport = this.viewport.getViewportInformation();

        imageScale = vport['imageScale'];  // arcseconds per pixel

        // Arc seconds
        x1 = vport['coordinates']['left']   * imageScale;
        x2 = vport['coordinates']['right']  * imageScale;
        y1 = vport['coordinates']['top']    * imageScale;
        y2 = vport['coordinates']['bottom'] * imageScale;

        // VSO SunPy Script Button
        $('#vso-sunpy').removeClass('inactive');
        $('#vso-sunpy').bind('click', function (e) {
            url  = Helioviewer.api + ''
                 + '?action=getSciDataScript'
                 + '&imageScale=' + imageScale
                 + '&sourceIds=[' + sourceIDs.join(',')+']'
                 + '&startDate='  + startDate.replace(/\//g, '-')
                 + '&endDate='    +   endDate.replace(/\//g, '-')
                 + '&lang=sunpy'
                 + '&provider=vso';
            body = '<a href="' + url + '">'
                 +     'Your Python/SunPy script for requesting science data '
                 +     'from the VSO is ready.<br /><br />'
                 +     '<b>Click here to download.</b>'
                 + '</a>';
            $(document).trigger("message-console-log", [body,
                { sticky: true, header: 'Just now' }, true, true]);
        });


        // VSO SolarSoft Script Button
        $('#vso-ssw').removeClass('inactive');
        $('#vso-ssw').bind('click', function (e) {
            url  = Helioviewer.api + ''
                 + '?action=getSciDataScript'
                 + '&imageScale=' + imageScale
                 + '&sourceIds=[' + sourceIDs.join(',')+']'
                 + '&startDate='  + startDate.replace(/\//g, '-')
                 + '&endDate='    +   endDate.replace(/\//g, '-')
                 + '&lang=sswidl'
                 + '&provider=vso'
                 + '&x1=' + x1
                 + '&y1=' + y1
                 + '&x2=' + x2
                 + '&y2=' + y2;
            body = '<a href="' + url + '">'
                 +     'Your IDL/SolarSoft script for requesting science data '
                 +     'from the VSO is ready.<br /><br />'
                 +     '<b>Click here to download.</b>'
                 + '</a>';
            $(document).trigger("message-console-log", [body,
                { sticky: true, header: 'Just now' }, true, true]);
        });

        // VSO Website Button
        $('#vso-www').attr('href', 'http://virtualsolar.org/cgi-bin/vsoui.pl'
            + '?startyear='   +   startDate.split('/')[0]
            + '&startmonth='  +   startDate.split('/')[1]
            + '&startday='    +   startDate.split('/')[2].split('T')[0]
            + '&starthour='   +   startDate.split('T')[1].split(':')[0]
            + '&startminute=' +   startDate.split('T')[1].split(':')[1]
            + '&endyear='     +     endDate.split('/')[0]
            + '&endmonth='    +     endDate.split('/')[1]
            + '&endday='      +     endDate.split('/')[2].split('T')[0]
            + '&endhour='     +     endDate.split('T')[1].split(':')[0]
            + '&endminute='   +     endDate.split('T')[1].split(':')[1]
            + '&instrument='  + instruments.join('&instrument=')
            + '&wave='        +            'other'
            + '&wavemin='     +    Math.min.apply(Math,waves)
            + '&wavemax='     +    Math.max.apply(Math,waves)
            + '&waveunit='    +            'Angstrom'
        );
        $('#vso-www').removeClass('inactive');


        $.each($('#accordion-vso').find('.label, .suffix'), function (i,text) {
            $(text).removeClass('inactive');
        });
        $.each($('#accordion-vso').find('input[disabled]'), function (i,node) {
            $(node).attr('disabled', false);
        });
    },


    setSDOthumbnails: function (sdoPreviews, imageAccordions, imageScale) {
        var html, nickname, startDate, endDate, sourceId, imageLayer,
            x1, x2, y1, y2, thumbImageScale;

        sdoPreviews.html('');

        $.each( imageAccordions, function(i, accordion) {

            nickname = $(accordion).find('.tile-accordion-header-left').html();

            if ( !$(accordion).find('.visible').hasClass('hidden') &&
                 ( nickname.search('AIA ') != -1 ||
                   nickname.search('HMI ') != -1 ) ) {

                sourceId = $(accordion).find('.tile-accordion-header-left').attr('data-sourceid');
                imageLayer = '['+sourceId+',1,100]';

                startDate = $('#sdo-start-date').val() + 'T'
                          + $('#sdo-start-time').val() + 'Z';
                endDate   = $('#sdo-end-date').val()   + 'T'
                          + $('#sdo-end-time').val()   + 'Z';

                if ( startDate == 'TZ' || endDate == 'TZ' ) {
                    return false;
                }

                x1 = Math.round(parseFloat($('#sdo-center-x').val()) - parseFloat($('#sdo-width').val()) / 2);
                x2 = Math.round(parseFloat($('#sdo-center-x').val()) + parseFloat($('#sdo-width').val()) / 2);

                y1 = Math.round(parseFloat($('#sdo-center-y').val()) - parseFloat($('#sdo-height').val()) / 2);
                y2 = Math.round(parseFloat($('#sdo-center-y').val()) + parseFloat($('#sdo-height').val()) / 2);

                thumbImageScale = parseFloat($('#sdo-width').val()) / 256;


                html = '';
                html = '<div class="header">'
                     +     nickname
                     + '</div>'
                     + '<div class="previews">'
                     +     '<img src="' + Helioviewer.api + '?action=takeScreenshot'
                     +     '&imageScale=' + thumbImageScale
                     +     '&layers='    + imageLayer
                     +     '&events=&eventLabels=false'
                     +     '&scale=false&scaleType=earth&scaleX=0&scaleY=0'
                     +     '&date='      + startDate
                     +     '&x1=' + x1
                     +     '&x2=' + x2
                     +     '&y1=' + y1
                     +     '&y2=' + y2
                     +     '&display=true&watermark=false" '
                     +     'class="preview start" '
                     +     'style="width:'+128+'; '
                     +     'height:'
                     +          Math.round( 128 / ( $('#sdo-width').val() /
                                                    $('#sdo-height').val()
                                                  )
                                          ) + ';"'
                     +     ' />'
                     +     '<img src="' + Helioviewer.api + '?action=takeScreenshot'
                     +     '&imageScale=' + thumbImageScale
                     +     '&layers='    + imageLayer
                     +     '&events=&eventLabels=false'
                     +     '&scale=false&scaleType=earth&scaleX=0&scaleY=0'
                     +     '&date='      + endDate
                     +     '&x1=' + x1
                     +     '&x2=' + x2
                     +     '&y1=' + y1
                     +     '&y2=' + y2
                     +     '&display=true&watermark=false" '
                     +     'class="preview end" '
                     +     'style="width:' + 128 + '; '
                     +     'height:'
                     +          Math.round( 128 / ( $('#sdo-width').val() /
                                                    $('#sdo-height').val()
                                                  )
                                          ) + ';"'
                     +     ' />'
                     + '</div>';

                sdoPreviews.append(html);
            }
        });
    },


    setSDOscriptDownloadButtons: function (imageAccordions, imageScale) {
        var sourceIDs = Array(), waves = Array(), sourceId, url, body,
            nickname, startDate, endDate, x1, x2, y1, y2;

        $.each( imageAccordions, function (i, accordion) {
            nickname = $(accordion).find('.tile-accordion-header-left').html();

            if ( !$(accordion).find('.visible').hasClass('hidden') &&
                ( nickname.search('AIA ') != -1 ||
                  nickname.search('HMI ') != -1 ) ) {

                nickname = $(accordion).find('.tile-accordion-header-left').html();
                sourceId = $(accordion).find('.tile-accordion-header-left').attr('data-sourceid');

                sourceIDs.push(sourceId);
                waves.push(nickname.split(' ')[1].padLeft('0',3));
            }
        });

        if ( sourceIDs.length == 0 || waves.length == 0 ) {
            $('#sdo-full-viewport').addClass('inactive');
            $('#sdo-select-area').addClass('inactive');
            $('#sdo-ssw').addClass('inactive');
            $('#sdo-www').addClass('inactive');
            return;
        }

        startDate = $('#sdo-start-date').val() + 'T'
                  + $('#sdo-start-time').val() + 'Z';
        endDate   = $('#sdo-end-date').val()   + 'T'
                  + $('#sdo-end-time').val()   + 'Z';

        if ( startDate == 'TZ' || endDate == 'TZ' ) {
            return false;
        }

        x1 = Math.round(parseFloat($('#sdo-center-x').val()) - parseFloat($('#sdo-width').val()) / 2);
        x2 = Math.round(parseFloat($('#sdo-center-x').val()) + parseFloat($('#sdo-width').val()) / 2);

        y1 = Math.round(parseFloat($('#sdo-center-y').val()) - parseFloat($('#sdo-height').val()) / 2);
        y2 = Math.round(parseFloat($('#sdo-center-y').val()) + parseFloat($('#sdo-height').val()) / 2);

        // SDO SolarSoft Script Button
        $('#sdo-ssw').removeClass('inactive');
        $('#sdo-ssw').bind('click', function (e) {
            url = Helioviewer.api + ''
                + '?action=getSciDataScript'
                + '&imageScale=' + imageScale
                + '&sourceIds=[' + sourceIDs.join(',') + ']'
                + '&startDate=' + startDate
                + '&endDate=' + endDate
                + '&lang=sswidl'
                + '&provider=sdo'
                + '&x1=' + x1
                + '&y1=' + y1
                + '&x2=' + x2
                + '&y2=' + y2;

            body = '<a href="' + url + '">'
                 +     'Your IDL/SolarSoft script for requesting science '
                 +     'data from the AIA/HMI Cut-out Serivce is ready.'
                 +     '<br /><br />'
                 +     '<b>Click here to download.</b>'
                 + '</a>';

            $(document).trigger("message-console-log",
                [body, {sticky: true, header: 'Just now'}, true, true]
            );
        });

        // SDO Website Button
        $('#sdo-www').attr('href', 'http://www.lmsal.com/get_aia_data/'
            + '?width='  + $('#sdo-width').val()
            + '&height=' + $('#sdo-height').val()
            + '&xCen='   +  $('#sdo-center-x').val()
            + '&yCen='   + ($('#sdo-center-y').val()*-1)
            + '&wavelengths=' + waves.join(',')
            + '&startDate=' + $('#vso-start-date').val().replace(/\//g,'-')
            + '&startTime=' + $('#vso-start-time').val().slice(0,-3)
            + '&stopDate='  + $('#vso-end-date').val().replace(/\//g,'-')
            + '&stopTime='  + $('#vso-end-time').val().slice(0,-3)
            + '&cadence=12'
        );


        $('#sdo-full-viewport').removeClass('inactive');
        $('#sdo-select-area').removeClass('inactive');

        $.each($('#accordion-sdo').find('.label, .suffix'), function (i,text) {
            $(text).removeClass('inactive');
        });
        $.each($('#accordion-sdo').find('input[disabled]'), function (i,node) {
            $(node).attr('disabled', false);
        });
        $('#sdo-www').removeClass('inactive');

    },


    /**
     * Clean up UI upon exiting data export image area select mode
     */
    _cleanup: function () {
        $.each(this._cleanupFunctions, function(i, func) {
            eval(func);
        });
    },


    /**
     * displays a dialog containing a link to the current page
     * @param {Object} url
     */
    displayURL: function (url, msg, displayDialog) {
        var displayDialog = typeof displayDialog !== 'undefined' ? displayDialog : false;
        
        // Get short URL before displaying
        var callback = function (response) {
            $(".helioviewer-long-url").attr("value", url);
            $(".helioviewer-short-url").attr("value", response.data.url);
			$(".helioviewer-url-shorten").removeAttr("checked");
			$(".helioviewer-url-input-box").attr('value', url).select();
            // Display URL
            if(displayDialog){
	            $("#helioviewer-url-box-msg").text(msg);
	            $("#url-dialog").dialog({
	                dialogClass: 'helioviewer-modal-dialog',
	                height    : 125,
	                maxHeight : 125,
	                width     : $('html').width() * 0.5,
	                minWidth  : 350,
	                modal     : true,
	                resizable : true,
	                title     : "Helioviewer - Direct Link",
	                open      : function (e) {
	                    
	                    $('.ui-widget-overlay').hide().fadeIn();
	                    
	                }
	            });
            }
        };

        // Get short version of URL and open dialog
        $.ajax({
            url: Helioviewer.api,
            dataType: Helioviewer.dataType,
            data: {
                "action": "shortenURL",
                "queryString": url.substr(this.serverSettings.rootURL.length + 2)
            },
            success: callback
        });
    },


    /**
     * Displays a URL to a Helioviewer.org movie
     *
     * @param string Id of the movie to be linked to
     */
    displayMovieURL: function (movieId) {
        var msg = "Use the following link to refer to this movie:",
            url = this.serverSettings.rootURL + "/?movieId=" + movieId;

        // Google analytics event
        if (typeof(_gaq) !== "undefined") {
            _gaq.push(['_trackEvent', 'Shares', 'Movie - URL']);
        }
        this.displayURL(url, msg, true);
    },

    /**
     * Displays recent news from the Helioviewer Project blog
     */
    displayBlogFeed: function (n, showDescription, descriptionWordLength) {
        var url, dtype, html = "";

        url = this.serverSettings.newsURL;

        // For remote queries, retrieve XML using JSONP
        if (Helioviewer.dataType === "jsonp") {
            dtype = "jsonp text xml";
        } else {
            dtype = "xml";
        }

        $.getFeed({
            url: Helioviewer.api,
            data: {"action": "getNewsFeed"},
            dataType: dtype,
            success: function (feed) {
                var link, date, more, description;

                // Display message if there was an error retrieving the feed
                if (!feed.items) {
                    $("#social-panel").append("Unable to retrieve news feed...");
                    return;
                }

                // Grab the n most recent articles
                $.each(feed.items.slice(0, n), function (i, a) {
                    link = "<a href='" + a.link + "' alt='" + a.title + "' target='_blank'>" + a.title + "</a><br />";
                    date = "<div class='article-date'>" + a.updated.slice(0, 26) + "UTC</div>";
                    html += "<div class='blog-entry'>" + link + date;

                    // Include description?
                    if (showDescription) {
                        description = a.description;

                        // Shorten if requested
                        if (typeof descriptionWordLength === "number") {
                            description = description.split(" ").slice(0, descriptionWordLength).join(" ") + " [...]";
                        }
                        html += "<div class='article-desc'>" + description + "</div>";
                    }

                    html += "</div>";
                });

                more = "<div id='more-articles'><a href='" + url +
                       "' title='The Helioviewer Project Blog'>Visit Blog...</a></div>";

                $("#social-panel").append(html + more);
            }
        });
    },

    /**
     * Launches an instance of JHelioviewer
     *
     * Helioviewer attempts to choose a 24-hour window around the current observation time. If the user is
     * currently browsing near the end of the available data then the window for which the movie is created
     * is shifted backward to maintain it's size.
     */
    launchJHelioviewer: function () {
        var endDate, params;

        // If currently near the end of available data, shift window back
        endDate = new Date(Math.min(this.timeControls.getDate().addHours(12), new Date()));

        params = {
            "action"    : "launchJHelioviewer",
            "endTime"   : endDate.toISOString(),
            "startTime" : endDate.addHours(-24).toISOString(),
            "imageScale": this.viewport.getImageScaleInKilometersPerPixel(),
            "layers"    : this.viewport.serialize()
        };
        window.open(Helioviewer.api + "?" + $.param(params), "_blank");
    },

    /**
     * Displays welcome message on user's first visit
     */
    _displayGreeting: function () {
        if (!Helioviewer.userSettings.get("notifications.welcome")) {
            return;
        }

        $(document).trigger("message-console-info",
            ["<b>Welcome to Helioviewer.org</b>, a solar data browser. First time here? Be sure to check out our " +
             "<a href=\"http://wiki.helioviewer.org/wiki/Helioviewer.org_User_Guide_2.4.0\" " +
             "class=\"message-console-link\" target=\"_blank\"> User Guide</a>.</br>", {"sticky": false, "life": 10000}]
        );

        Helioviewer.userSettings.set("notifications.welcome", false);
    },

    /**
     * Returns the current observation date
     *
     * @return {Date} observation date
     */
    getDate: function () {
        return this.timeControls.getDate();
    },

    /**
     * Returns the currently loaded layers
     *
     * @return {String} Serialized layer string
     */
    getLayers: function () {
        return this.viewport.serialize();
    },

    /**
     * Returns the currently selected event layers
     *
     * @return {String} Serialized event layer string
     */
    getEvents: function () {
        return this.viewport.serializeEvents();
    },

    /**
     * Returns the currently selected event layers
     *
     * @return {String} Serialized event layer string
     */
    getEventsLabels: function () {
        return Helioviewer.userSettings.get("state.eventLabels");
    },

    /**
     * Returns a string representation of the layers which are visible and
     * overlap the specified region of interest
     */
    getVisibleLayers: function (roi) {
        return this.viewport.getVisibleLayers(roi);
    },

    /**
     * Returns the currently displayed image scale
     *
     * @return {Float} image scale in arc-seconds/pixel
     */
    getImageScale: function () {
        return this.viewport.getImageScale();
    },

    /**
     * Returns the top-left and bottom-right coordinates for the viewport region of interest
     *
     * @return {Object} Current ROI
     */
    getViewportRegionOfInterest: function () {
        return this.viewport.getRegionOfInterest();
    },

    /**
     * Builds a URL for the current view
     *
     * @TODO: Add support for viewport offset, event layers, opacity
     *
     * @returns {String} A URL representing the current state of Helioviewer.org.
     */
    toURL: function (shorten) {
        // URL parameters
        var params = {
            "date"        : this.viewport._tileLayerManager.getRequestDateAsISOString(),
            "imageScale"  : this.viewport.getImageScale(),
            "centerX"     : Helioviewer.userSettings.get("state.centerX"),
            "centerY"     : Helioviewer.userSettings.get("state.centerY"),
            "imageLayers" : encodeURI(this.viewport.serialize()),
            "eventLayers" : encodeURI(this.viewport.serializeEvents()),
            "eventLabels" : Helioviewer.userSettings.get("state.eventLabels")
        };

        return this.serverSettings.rootURL + "/?" + decodeURIComponent($.param(params));
    },

    updateHeightsInsideViewportContainer: function() {
        var newHeight, sidebars, windowHeight = parseInt($(window).height()),
            header, viewport, drawerBottom, drawerLeft, drawerRight;

        header       = $('#hv-header');
        viewport     = $('#helioviewer-viewport');
        drawerLeft   = $('#hv-drawer-left');
        drawerBottom = $('#hv-drawer-timeline');
        //left sidebars
        var drawerNews   	= $('#hv-drawer-news');
        var drawerYouTube   = $('#hv-drawer-youtube');
        var drawerMovies   	= $('#hv-drawer-movies');
        var drawerScreenshots = $('#hv-drawer-screenshots');
        var drawerData   	= $('#hv-drawer-data');
        var drawerShare   	= $('#hv-drawer-share');
        var drawerHelp   	= $('#hv-drawer-help');

        sidebars = [drawerLeft, drawerNews, drawerYouTube, drawerMovies, drawerScreenshots, drawerData, drawerShare, drawerHelp];
		
        $.each(sidebars, function(i, sidebar) {
            if(self.drawerTimelineOpened == true){
	            
	            newHeight = windowHeight
                      - parseInt(header.css('border-top-width'))
                      - parseInt(header.css('margin-top'))
                      - parseInt(header.css('padding-top'))
                      - parseInt(header.css('height'))
                      - parseInt(header.css('padding-bottom'))
                      - parseInt(header.css('margin-bottom'))
                      - parseInt(header.css('border-bottom-width'))
                      - parseInt(sidebar.css('border-top-width'))
                      - parseInt(sidebar.css('margin-top'))
                      - parseInt(sidebar.css('padding-top'))
                      - parseInt(sidebar.css('padding-bottom'))
                      - parseInt(sidebar.css('margin-bottom'))
                      - parseInt(sidebar.css('border-bottom-width'));

				sidebar.css('max-height', (newHeight - self.drawerTimelineOpenedHeight) + 'px');
            }else{
	            sidebar.css('max-height', '100%');
            }
        });
		/*
        newHeight = windowHeight
                  - parseInt(viewport.css('padding-top'))
                  - parseInt(viewport.css('padding-bottom'));
        $('#helioviewer-viewport').css('height', newHeight);

        newHeight = windowHeight
                  - parseInt($('#helioviewer-header').css('height'));
        $('#helioviewer-viewport-container').css('height', newHeight);*/
    },

    drawerLeftClick: function(openNow) {
        if ( this.drawerLeftOpened || openNow === false ) {
            $('.drawer-contents', this.drawerLeft).hide();
            $(this.drawerLeft).hide();
            this.drawerLeft.css('width', 0);
            this.drawerLeft.css('height', 0);
            this.drawerLeft.css('padding', 0);
            this.drawerLeft.css('border', 'none');
            this.drawerLeftTab.css('left', '-2.7em');
            this.drawerLeftOpened = false;
            Helioviewer.userSettings.set("state.drawers.#hv-drawer-left.open", false);
        }
        else if ( !this.drawerLeftOpened || openNow === true ) {
            this.drawerLeft.css('width', this.drawerLeftOpenedWidth+'em');
            this.drawerLeft.css('height', 'auto');
            this.drawerLeft.css('border-right', this.drawerLeftTabBorderRight);
            this.drawerLeft.css('border-bottom', this.drawerLeftTabBorderBottom);
            this.drawerLeftTab.css('left', (this.drawerLeftOpenedWidth+this.drawerLeftTabLeft)+'em');
            $(this.drawerLeft.parent()).css('left', this.drawerLeftOpenedWidth+'em');
            this.drawerLeft.show();
            $('.drawer-contents', this.drawerLeft).show();

            this.drawerLeftOpened = true;
            Helioviewer.userSettings.set("state.drawers.#hv-drawer-left.open", true);
            this.reopenAccordions(this.drawerLeft);
        }
        return;
    },
	
	drawerTimelineClick: function(openNow) {
        if ( this.drawerTimelineOpened || openNow === false ) {
            this.drawerTimeline.css('height', 0);
            $('.drawer-contents', this.drawerTimeline).hide();
            this.drawerTimeline.css('padding', 0);
            
            //for (var i=1; i<=this.drawerSpeed; i=i+10) {
            //    setTimeout(this.updateHeightsInsideViewportContainer, i);
            //}
            setTimeout(
                this.updateHeightsInsideViewportContainer,
                this.drawerSpeed*2
            );
			
			Helioviewer.userSettings.set("state.drawers.#hv-drawer-timeline.open", false);
            this.drawerTimelineOpened = false;
        }
        else if ( !this.drawerTimelineOpened || openNow === true ) {
            var imageLayersStr = Helioviewer.userSettings.parseLayersURLString();
	        if(imageLayersStr == ''){
		        $(document).trigger("message-console-log", ["To open Data Timeline you must have at least one visible image layer.", {sticky: true,header: "Just now"}, true, true]);
		        return;
	        }
            
            this.drawerTimeline.css('height', this.drawerTimelineOpenedHeight + 'px');
            $('.drawer-contents', this.drawerTimeline).show();
            
            //for (var i=1; i<=this.drawerSpeed; i=i+10) {
            //    setTimeout(this.updateHeightsInsideViewportContainer, i);
            //}
            setTimeout(self.updateHeightsInsideViewportContainer, this.drawerSpeed);
			
			Helioviewer.userSettings.set("state.drawers.#hv-drawer-timeline.open", true);
            this.drawerTimelineOpened = true;
            
			if(typeof this.timeline == 'undefined'){
				this.timeline   = new Timeline();				
			}else{
				this.timeline.drawPlotLine();
			}
        }

        return;
    },

    drawerNewsClick: function(openNow) {
        var self = this, buttonId = "#news-button";

        this.closeTabDrawersExcept(buttonId, '#'+this.drawerNews.attr('id'));

        if ( $(buttonId).hasClass('opened') || openNow === false ) {
            self.drawerNews.css('transition', '');
            $('.drawer-contents', this.drawerNews).fadeOut(10);
            this.drawerNews.css('width', 0);
            this.drawerNews.css('height', 0);
            this.drawerNews.css('padding', 0);
            this.drawerNews.css({'display':'none'});
            $(buttonId).removeClass('opened');
            Helioviewer.userSettings.set("state.drawers.#hv-drawer-news.open", false);
        }
        else if ( !$(buttonId).hasClass('opened') || openNow === true ) {
            self.drawerNews.css('transition', 'height 500ms');
            this.drawerNews.css('width', this.drawerNewsOpenedWidth);
            this.drawerNews.css('height', this.drawerNewsOpenedHeight);
            setTimeout(function () {
                self.drawerNews.show();
                $('.drawer-contents', this.drawerNews).fadeIn(500);
                self.drawerNews.css('transition', '');
            }, this.drawerSpeed);
            $(buttonId).addClass('opened');
            Helioviewer.userSettings.set("state.drawers.#hv-drawer-news.open", true);
            this.reopenAccordions(this.drawerNews);
        }

        return;
    },

    drawerYoutubeClick: function(openNow) {
        var self = this, buttonId = "#youtube-button";

        this.closeTabDrawersExcept(buttonId, '#'+this.drawerYoutube.attr('id'));

        if ( $(buttonId).hasClass('opened') || openNow === false ) {
            self.drawerYoutube.css('transition', '');
            $('.drawer-contents', this.drawerYoutube).fadeOut(10);
            this.drawerYoutube.css('width', 0);
            this.drawerYoutube.css('height', 0);
            this.drawerYoutube.css('padding', 0);
            this.drawerYoutube.css({'display':'none'});
            $(buttonId).removeClass('opened');
            Helioviewer.userSettings.set("state.drawers.#hv-drawer-youtube.open", false);
        }
        else if ( !$(buttonId).hasClass('opened') || openNow === true ) {
            self.drawerYoutube.css('transition', 'height 500ms');
            this.drawerYoutube.css('width', this.drawerYoutubeOpenedWidth);
            this.drawerYoutube.css('height', this.drawerYoutubeOpenedHeight);
            setTimeout(function () {
                self.drawerYoutube.show();
                $('.drawer-contents', this.drawerYoutube).fadeIn(500);
                self.drawerYoutube.css('transition', '');
            }, this.drawerSpeed);
            $(buttonId).addClass('opened');
            Helioviewer.userSettings.set("state.drawers.#hv-drawer-youtube.open", true);
            this.reopenAccordions(this.drawerYoutube);
        }

        return;
    },

    drawerMoviesClick: function(openNow) {
        var self = this, buttonId = "#movies-button";

        this.closeTabDrawersExcept(buttonId, '#'+this.drawerMovies.attr('id'));

        if ( $(buttonId).hasClass('opened') || openNow === false ) {
            self.drawerMovies.css('transition', '');
            $('.drawer-contents', this.drawerMovies).fadeOut(10);
            this.drawerMovies.css('width', 0);
            this.drawerMovies.css('height', 0);
            this.drawerMovies.css('padding', 0);
            this.drawerMovies.css({'display':'none'});
            $(buttonId).removeClass('opened');
            Helioviewer.userSettings.set("state.drawers.#hv-drawer-movies.open", false);
        }
        else if ( !$(buttonId).hasClass('opened') || openNow === true ) {
            self.drawerMovies.css('transition', 'height 500ms');
            this.drawerMovies.css('width', this.drawerMoviesOpenedWidth);
            this.drawerMovies.css('height', this.drawerMoviesOpenedHeight);
            setTimeout(function () {
                self.drawerMovies.show();
                $('.drawer-contents', this.drawerMovies).fadeIn(500);
                self.drawerMovies.css('transition', '');
            }, this.drawerSpeed);
            $(buttonId).addClass('opened');
            Helioviewer.userSettings.set("state.drawers.#hv-drawer-movies.open", true);
            this.reopenAccordions(this.drawerMovies);
        }

        return;
    },

    drawerScreenshotsClick: function(openNow) {
        var self = this, buttonId = "#screenshots-button";

        this.closeTabDrawersExcept(buttonId, '#'+this.drawerScreenshots.attr('id'));

        if ( $(buttonId).hasClass('opened') || openNow === false ) {
            self.drawerScreenshots.css('transition', '');
            $('.drawer-contents', this.drawerScreenshots).fadeOut(10);
            this.drawerScreenshots.css('width', 0);
            this.drawerScreenshots.css('height', 0);
            this.drawerScreenshots.css('padding', 0);
            this.drawerScreenshots.css({'display':'none'});
            $(buttonId).removeClass('opened');
            Helioviewer.userSettings.set("state.drawers.#hv-drawer-screenshots.open", false);
        }
        else if ( !$(buttonId).hasClass('opened') || openNow === true ) {
            self.drawerScreenshots.css('transition', 'height 500ms');
            this.drawerScreenshots.css('width', this.drawerScreenshotsOpenedWidth);
            this.drawerScreenshots.css('height', this.drawerScreenshotsOpenedHeight);
            setTimeout(function () {
                self.drawerScreenshots.show();
                $('.drawer-contents', this.drawerScreenshots).fadeIn(500);
                self.drawerScreenshots.css('transition', '');
            }, this.drawerSpeed);
            $(buttonId).addClass('opened');
            Helioviewer.userSettings.set("state.drawers.#hv-drawer-screenshots.open", true);
            this.reopenAccordions(this.drawerScreenshots);
        }

        return;
    },

    drawerDataClick: function(openNow) {
        var self = this, buttonId = "#data-button";

        this.closeTabDrawersExcept(buttonId, '#'+this.drawerData.attr('id'));

        if ( $(buttonId).hasClass('opened') || openNow === false ) {
            self.drawerData.css('transition', '');
            $('.drawer-contents', this.drawerData).fadeOut(10);
            this.drawerData.css('width', 0);
            this.drawerData.css('height', 0);
            this.drawerData.css('padding', 0);
            this.drawerData.css({'display':'none'});
            $(buttonId).removeClass('opened');
            Helioviewer.userSettings.set("state.drawers.#hv-drawer-data.open", false);

        }
        else if ( !$(buttonId).hasClass('opened') || openNow === true ) {
            self.drawerData.css('transition', 'height 500ms');
            this.drawerData.css('width', this.drawerDataOpenedWidth);
            this.drawerData.css('height', this.drawerDataOpenedHeight);
            setTimeout(function () {
                self.drawerData.show();
                $('.drawer-contents', this.drawerData).fadeIn(500);
                self.drawerData.css('transition', '');
            }, this.drawerSpeed);
            $(buttonId).addClass('opened');
            Helioviewer.userSettings.set("state.drawers.#hv-drawer-data.open", true);
            this.reopenAccordions(this.drawerData);

            setTimeout(function () {
                $(document).trigger('update-external-datasource-integration');
            }, 50);
        }

        return;
    },

    drawerShareClick: function(openNow) {
        var self = this, buttonId = "#share-button";

        this.closeTabDrawersExcept(buttonId, '#'+this.drawerShare.attr('id'));

        if ( $(buttonId).hasClass('opened') || openNow === false ) {
            self.drawerShare.css('transition', '');
            $('.drawer-contents', this.drawerShare).fadeOut(10);
            this.drawerShare.css('width', 0);
            this.drawerShare.css('height', 0);
            this.drawerShare.css('padding', 0);
            this.drawerShare.css({'display':'none'});
            $(buttonId).removeClass('opened');
            Helioviewer.userSettings.set("state.drawers.#hv-drawer-share.open", false);
        }
        else if ( !$(buttonId).hasClass('opened') || openNow === true ) {
            self.drawerShare.css('transition', 'height 500ms');
            this.drawerShare.css('width', this.drawerShareOpenedWidth);
            this.drawerShare.css('height', this.drawerShareOpenedHeight);
            setTimeout(function () {
                self.drawerShare.show();
                $('.drawer-contents', this.drawerShare).fadeIn(500);
                self.drawerShare.css('transition', '');
            }, this.drawerSpeed);
            $(buttonId).addClass('opened');
            Helioviewer.userSettings.set("state.drawers.#hv-drawer-share.open", true);
            this.reopenAccordions(this.drawerShare);
        }

        return;
    },

    drawerHelpClick: function(openNow) {
        var self = this,
            buttonId = '#help-button';

        this.closeTabDrawersExcept(buttonId, '#'+this.drawerHelp.attr('id'));

        if ( $(buttonId).hasClass('opened') || openNow === false ) {
            self.drawerHelp.css('transition', '');
            $('.drawer-contents', this.drawerHelp).fadeOut(10);
            this.drawerHelp.css('width', 0);
            this.drawerHelp.css('height', 0);
            this.drawerHelp.css('padding', 0);
            this.drawerHelp.css({'display':'none'});
            $(buttonId).removeClass('opened');
            Helioviewer.userSettings.set("state.drawers.#hv-drawer-help.open", false);
        }
        else if ( !$(buttonId).hasClass('opened') || openNow === true ) {
            self.drawerHelp.css('transition', 'height 500ms');
            this.drawerHelp.css('width', this.drawerHelpOpenedWidth);
            this.drawerHelp.css('height', this.drawerHelpOpenedHeight);
            setTimeout(function () {
                self.drawerHelp.show();
                $('.drawer-contents', this.drawerHelp).fadeIn(500);
                self.drawerHelp.css('transition', '');
            }, this.drawerSpeed);
            $(buttonId).addClass('opened');
            Helioviewer.userSettings.set("state.drawers.#hv-drawer-help.open", true);
            this.reopenAccordions(this.drawerHelp);
        }

        return;
    },

    drawerSettingsClick: function() {

        if ( $(buttonId).hasClass('opened') ) {
            $(buttonId).removeClass('opened');
        }
        else if ( !$(buttonId).hasClass('opened') ) {
            $(buttonId).addClass('opened');
        }

        return;
    },

    accordionHeaderClick: function(event, openNow) {
        var obj = $(event.target).parent().find('.disclosure-triangle'),
            drawerId    = obj.parent().parent().parent().parent().attr('id'),
            accordionId = obj.parent().parent().attr('id');

        if ( typeof obj.attr('class') == 'undefined' ) {
            return false;
        }

        if ( obj.attr('class').indexOf('closed') != -1 || openNow === true) {
            obj.html('▼');
            obj.addClass('opened');
            obj.removeClass('closed');
            $('.content', obj.parent().parent()).show();
            Helioviewer.userSettings.set("state.drawers.#"+drawerId+".accordions.#"+accordionId+".open", true);
        }
        else {
            obj.html('►');
            obj.addClass('closed');
            obj.removeClass('opened');
            $('.content', obj.parent().parent()).hide();
            Helioviewer.userSettings.set("state.drawers.#"+drawerId+".accordions.#"+accordionId+".open", false);
        }

        if ( accordionId == 'accordion-vso' ||
             accordionId == 'accordion-sdo' ) {

            $(document).trigger('update-external-datasource-integration');
        }

        event.stopPropagation();
    },

    reopenAccordions: function(drawer) {
        var self = this,
            accordions = drawer.find('.accordion'),
            accordionUserSettings = Helioviewer.userSettings.get("state.drawers.#"+drawer.attr('id')+".accordions"),
            trigger = false;

        if ( Object.keys(accordionUserSettings).length > 0 ) {
            $.each(accordionUserSettings, function(selector, accordionObj) {
                if ( accordionObj.open ) {
                    $(selector).find('.header').trigger("click", [true]);
                    if ( selector == '#accordion-vso' ||
                         selector == '#accordion-sdo' ) {

                        trigger = true;
                    }
                }
            });
        }

        if ( trigger ) {
            $(document).trigger('update-external-datasource-integration');
        }

        return;
    },

    closeTabDrawersExcept: function (buttonId, drawerId) {
        self = this;

        $.each( this.tabbedDrawers, function (i, drawer) {
            if ( drawer != drawerId ) {
                $('.drawer-contents', drawer).fadeOut(100);
                $(drawer).css('height', 0);
                $(drawer).css('width', 0);
                $(drawer).css('padding', 0);
                $(drawer).css({'display':'none'});
                $(self.tabbedDrawerButtons[drawer]).removeClass('opened');
                Helioviewer.userSettings.set("state.drawers."+drawer+".open", false);
            }
        });

    },

    contextualHelpClick: function (event) {
        var alertText = $(event.target).attr('title');
        alertText = alertText.replace(/<\/?[^>]+(>|$)/g, "");
        alert( alertText );
        event.stopPropagation();
    },

    twitter: function(e) {
        var href   = 'https://twitter.com/share?url='
                   + encodeURIComponent($('.helioviewer-short-url').val())
                   + '&text=Helioviewer.org - Solar and heliospheric image visualization tool',
            target = $(e.target).attr('target');
        e.stopPropagation();

        window.open(href, target);
        return false;
    },

    facebook: function(e) {
        var href   = 'https://www.facebook.com/sharer/sharer.php?'
                   + '&s=100'
                   + '&p[images][0]='+encodeURIComponent(Helioviewer.api+'?action=downloadScreenshot&id=3240748')
                   + '&p[title]=Helioviewer.org - Solar and heliospheric image visualization tool'
                   + '&p[url]='+encodeURIComponent($('.helioviewer-long-url').val()),
            target = $(e.target).attr('target');
        e.stopPropagation();

        window.open(href, target);
        return false;
    },

    google: function(e) {
        var href   = 'https://plus.google.com/share?url='+encodeURIComponent($('.helioviewer-long-url').val()),
            target = $(e.target).attr('target');
        e.stopPropagation();

        window.open(href, target);
        return false;
    },

    pinterest: function() {
        self = this;
        $('#pinterest-button').unbind('click');

        var url = encodeURIComponent(self.toURL());
        var media = encodeURIComponent(Helioviewer.api+'?action=downloadScreenshot&id=3240748');
        var desc = 'Helioviewer.org - Solar and heliospheric image visualization tool '+encodeURIComponent($('.helioviewer-short-url').val());
        window.open("//www.pinterest.com/pin/create/button/"+
        "?url="+url+
        "&media="+media+
        "&description="+desc, "hv_pinterest");

        $('#pinterest-button').bind('click', $.proxy(this.pinterest, this));
        return;
    },

    updateExternalDataSourceIntegration: function (event) {
        var imageAccordions = $('#accordion-images .dynaccordion-section'),
            vsoLinks        = $('#vso-links'),
            vsoPreviews     = $('#vso-previews'),
            vsoButtons      = $('#vso-buttons'),
            sdoPreviews     = $('#sdo-previews'),
            sdoButtons      = $('#sdo-buttons'),
            vport, imageScale;

        if ( typeof this.viewport._tileLayerManager == 'undefined' ) {
            return false;
        }

        vport = this.viewport.getViewportInformation();
        imageScale = vport['imageScale'];  // Arcseconds per pixel

        if ( $('#accordion-vso .content').is(':visible') ) {
            this.updateVSOaccordion(vsoLinks, vsoPreviews, vsoButtons,
                imageAccordions, imageScale);
        }

        if ( $('#accordion-sdo .content').is(':visible') ) {
            this.updateSDOaccordion(sdoPreviews, sdoButtons, imageAccordions,
                imageScale);
        }
    },


    _setVSOtimes: function (startDate, startTime, endDate, endTime) {

        if ( startDate=='' || startTime=='' || endDate=='' || endTime=='' ) {

            startDate = this.viewport.getEarliestLayerDate().toUTCDateString();
            startTime = this.viewport.getEarliestLayerDate().toUTCTimeString();

            endDate   = this.viewport.getLatestLayerDate().toUTCDateString();
            endTime   = this.viewport.getLatestLayerDate().toUTCTimeString();
        }

        $('#vso-start-date').val( startDate );
        $('#vso-start-time').val( startTime );

        $('#vso-end-date').val( endDate );
        $('#vso-end-time').val( endTime );
    },

    /**
     * TODO: Ignore non-AIA/HMI layers
     */
    _setSDOtimes: function (startDate, startTime, endDate, endTime) {

        if ( startDate=='' || startTime=='' || endDate=='' || endTime=='' ) {

            startDate = this.viewport.getEarliestLayerDate().toUTCDateString();
            startTime = this.viewport.getEarliestLayerDate().toUTCTimeString();

            endDate   = this.viewport.getLatestLayerDate().toUTCDateString();
            endTime   = this.viewport.getLatestLayerDate().toUTCTimeString();
        }

        $('#sdo-start-date').val( startDate );
        $('#sdo-start-time').val( startTime );

        $('#sdo-end-date').val( endDate );
        $('#sdo-end-time').val( endTime );
    },


    /**
     * Sun-related Constants
     */
    constants: {
        au: 149597870700, // 1 au in meters (http://maia.usno.navy.mil/NSFA/IAU2009_consts.html)
        rsun: 695700000  // radius of the sun in meters (JHelioviewer)
    }
});