/**
 * MovieManager class definition
 * @author <a href="mailto:jeff.stys@nasa.gov">Jeff Stys</a>
 * @author <a href="mailto:keith.hughitt@nasa.gov">Keith Hughitt</a>
 *
 * TODO 2011/03/14: Choose a reasonable limit for the number of entries based on whether or not
 * localStorage is supported: if supported limit can be large (e.g. 100), otherwise should be
 * closer to 3 entries.
 *
 * Movie Status:
 *  0 QUEUED
 *  1 PROCESSING
 *  2 COMPLETED
 *  3 ERROR
 *
 */
/*jslint browser: true, white: true, onevar: true, undef: true, nomen: false, eqeqeq: true, plusplus: true,
bitwise: true, regexp: false, strict: true, newcap: true, immed: true, maxlen: 120, sub: true */
/*global Helioviewer, MediaManager, $, setTimeout */
"use strict";
var MovieManager = MediaManager.extend(
    /** @lends MovieManager.prototype */
    {
    /**
     * @constructs
     * Creates a new MovieManager instance
     */
    init: function (movies) {
        this._super(movies);
        this.format   = $.support.vp8 ? "webm" : "mp4";

        // Check status of any previously unfinished movie requests
        var self = this;
        $.each(movies, function (i, movie) {
            if (movie.status < 2) {
                self._monitorQueuedMovie(movie.id, Date.parseUTCDate(movie.dateRequested), movie.token);
            }
        });
    },

    /**
     * Adds a new movie
     *
     * @param {Int}     id            Movie id
     * @param {Float}   duration      Movie duration in seconds
     * @param {Float}   imageScale    Image scale for the movie
     * @param {String}  layers        Layers in the movie serialized as a string
     * @param {String}  dateRequested Date string for when the movie was requested
     * @param {String}  startDate     Observation date associated with the first movie frame
     * @param {String}  endDate       Observation date associated with the last movie frame
     * @param {Float}   frameRate     Movie frame-rate in frames/sec
     * @param {Int}     numFrames     Total number of frames in the movie
     * @param {Float}   x1            Top-left corner x-coordinate
     * @param {Float}   y1            Top-left corner y-coordinate
     * @param {Float}   x2            Bottom-right corner x-coordinate
     * @param {Float}   y2            Bottom-right corner y-coordinate
     * @param {Int}     width         Movie width
     * @param {Int}     height        Movie height
     *
     * @return {Movie} A Movie object
     */
    add: function (
            id, duration, imageScale, layers, events, scale,
            scaleType, scaleX, scaleY, dateRequested, startDate, endDate,
            frameRate, numFrames, x1, x2, y1, y2, width, height, thumbnail, url
    ) {
        var movie = {
            "id"            : id,
            "duration"      : duration,
            "imageScale"    : imageScale,
            "layers"        : layers,
            "events"        : events,
            "scale"         : scale,
            "scaleType"     : scaleType,
            "scaleX"        : scaleX,
            "scaleY"        : scaleY,
            "dateRequested" : dateRequested,
            "startDate"     : startDate,
            "endDate"       : endDate,
            "frameRate"     : frameRate,
            "numFrames"     : numFrames,
            "x1"            : x1,
            "x2"            : x2,
            "y1"            : y1,
            "y2"            : y2,
            "width"         : width,
            "height"        : height,
            "ready"         : true,
            "name"          : this._getName(layers),
            "status"        : 2,
            "thumbnail"     : thumbnail,
            "url"           : url,
            "size"          : 0
        };
        this._super(movie);

        return movie;
    },

    /**
     * Adds a movie that is currently being processed
     *
     * @param {Int}     id            Movie id
     * @param {Int}     eta           Estimated time in seconds before movie is ready
     * @param {String}  token         Resque token for tracking status in queue
     * @param {Float}   imageScale    Image scale for the movie
     * @param {String}  layers        Layers in the movie serialized as a string
     * @param {String}  dateRequested Date string for when the movie was requested
     * @param {String}  startDate     Observation date associated with the first movie frame
     * @param {String}  endDate       Observation date associated with the last movie frame
     * @param {Float}   x1            Top-left corner x-coordinate
     * @param {Float}   y1            Top-left corner y-coordinate
     * @param {Float}   x2            Bottom-right corner x-coordinate
     * @param {Float}   y2            Bottom-right corner y-coordinate
     *
     * @return {Movie} A Movie object
     */
    queue: function (id, eta, token, imageScale, layers, 
                events, scale, scaleType, scaleX, scaleY, dateRequested, startDate,
                endDate, x1, x2, y1, y2, size) {

        var movie = {
            "id"            : id,
            "imageScale"    : imageScale,
            "layers"        : layers,
            "events"        : events,
            "scale"         : scale,
            "scaleType"     : scaleType,
            "scaleX"        : scaleX,
            "scaleY"        : scaleY,
            "dateRequested" : dateRequested,
            "startDate"     : startDate,
            "endDate"       : endDate,
            "x1"            : x1,
            "x2"            : x2,
            "y1"            : y1,
            "y2"            : y2,
            "status"        : 0,
            "token"         : token,
            "name"          : this._getName(layers),
            "progress"      : 0,
            "size"      	: size
        };

        if (this._history.unshift(movie) > this._historyLimit) {
            this._history = this._history.slice(0, this._historyLimit);
        }

        this._monitorQueuedMovie(id, Date.parseUTCDate(dateRequested), token, 5);

        this._save();
        return movie;
    },

    /**
     * Updates stored information for a given movie and notify user that movie is available
     *
     * @param {Int}     id            Movie id
     * @param {Float}   frameRate     Movie frame-rate in frames/sec
     * @param {Int}     numFrames     Total number of frames in the movie
     * @param {String}  startDate     The actual movie start date
     * @param {String}  endDate       The actual movie end date
     * @param {Int}     width         Movie width
     * @param {Int}     height        Movie height
     */
    update: function (id, params) {

        var movie = this.get(id);

        // Add the new values
        $.extend(movie, params);

        this._save();
    },

    /**
     * Displays a jGrowl notification to the user informing them that their
     * download has completed
     */
    _displayDownloadNotification: function (movie) {
        var jGrowlOpts, message, self = this;

        // Options for the jGrowl notification
        jGrowlOpts = {
            sticky: true,
            header: "Just now",
            open:    function (msg) {
                msg.find(".message-console-movie-ready").data("movie", movie);
            }
        };
        
        message = "<span class='message-console-movie-ready' data-id=\""+movie.id+"\">" +
                  "Your " + movie.name + " movie is ready! " +
                  "Click here to watch or download it.</span>";

        // Create the jGrowl notification.
        Helioviewer.messageConsole.success(message, jGrowlOpts);

        // Create "Web Notificaions API" notification
        if("Notification" in window){//browser supports notifications
            if (Notification.permission === "granted") {
                // If it's okay let's create a notification
                var title = "Movie Complete!"
                var options = {
                    body: "Your " + movie.name + " movie is ready!\n\nClick here to open the movie player.",
                    icon: movie.thumbnail

                };
                var notification = new Notification(title, options);
                notification.onclick = function(event){
                    if (movie.status === 2) {
                        var dialog = $("#movie-player-" + movie.id);
                        // If the movie player dialog does not exist, create one
                        if (dialog.length == 0) {
                            helioviewerWebClient._movieManagerUI._createMoviePlayerDialog(movie);
                        }
                    }
                }
            }
        }
        // End "Web Notifications UI" notification
    },

    /**
     * Monitors a queued movie and notifies the user when it becomes available
     */
    _monitorQueuedMovie: function (id, dateRequested, token, eta)
    {
        var queryMovieStatus, self = this;

        queryMovieStatus = function () {
            var params, callback;

            callback = function (response) {

                // If the user has removed the movie from history, stop monitoring
                if (!self.has(id)) {
                    return;
                }

                // Check status
                if (response.status < 2) {
                    // If more than 24 hours has elapsed, set status to ERROR
                    if ((Date.now() - dateRequested) / 1000 > (24 * 60 * 60)) {
                        self._abort(id);
                    }
                    
                    var status = '';
                    if(response.status == 0){
	                    status = '<span style="color:#f9a331">queued</span>';
	                    if(typeof response.jobStatus != 'undefined' && response.jobStatus == 3){
		                    var movie = self.get(id);
		                    self._abort(id, true);
		                    helioviewerWebClient._movieManagerUI._rebuildItem(movie);
	                    }
                    }else{
	                    var progress = Math.round(response.progress * 100);
	                    status = '<span class="processing">processing '+progress+'%</span>';
	                    self.update(id, {'status':1, 'progress':progress});
                    }
                    
                    // Otherwise continue to monitor
                    self._monitorQueuedMovie(id, dateRequested, token, 60);
                    
                    $('#movie-'+id+' .status').html(status);
                } else if (response.error) {
                    self._abort(id);
                }  else {
                    self.update(id, {
			            "frameRate" : response.frameRate,
			            "numFrames" : response.numFrames,
			            "startDate" : response.startDate,
			            "endDate"   : response.endDate,
			            "width"     : response.width,
			            "height"    : response.height,
			            "status"    : 2,
			            "thumbnail" : response.thumbnails.small,
			            "url"       : response.url
			        });
					
					var movie = self.get(id);
			        // Update preview tooltip
			        $(document).trigger("movie-ready", [movie]);
			
			        // Notify user
			        self._displayDownloadNotification(movie);
                }
            };

            params = {
                "action" : "getMovieStatus",
                "id"     : id,
                "token"  : token,
                "format" : self.format
            };

            $.get(Helioviewer.api, params, callback, Helioviewer.dataType).fail((resp) => {
                self._abort(id);
            });
        };
        setTimeout(queryMovieStatus, Math.max(eta, 5) * 1000);
    },

    /**
     * Aborts a failed movie request
     */
    _abort: function (id, doNotShowMsg) {
        var error, movie = this.get(id);

        // Mark as failed
        movie["status"] = 3;
        this._save();
		
		if(doNotShowMsg != true){
			// Notify user
			error = "Sorry, we were unable to create the movie you requested. " +
                "This usually means that there are not enough images for the " +
                "time range requested. Please try adjusting the observation " +
                "date or movie duration and try creating a new movie.";

			$(document).trigger("message-console-error", [error, {"sticky": true}]);
		}
    },

    /**
     * Saves the current list of movies
     */
    _save: function () {
        Helioviewer.userSettings.set("history.movies", this._history);
    }
});
