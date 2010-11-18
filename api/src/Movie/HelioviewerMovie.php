<?php
/* vim: set expandtab tabstop=4 shiftwidth=4 softtabstop=4: */
/**
 * Movie_HelioviewerMovie Class Definition
 *
 * PHP version 5
 *
 * @category Movie
 * @package  Helioviewer
 * @author   Keith Hughitt <keith.hughitt@nasa.gov>
 * @author   Jaclyn Beck <jaclyn.r.beck@gmail.com>
 * @license  http://www.mozilla.org/MPL/MPL-1.1.html Mozilla Public License 1.1
 * @link     http://launchpad.net/helioviewer.org
 */
require_once HV_ROOT_DIR . '/api/src/Movie/FFMPEGWrapper.php';
require_once HV_ROOT_DIR . '/api/src/Helper/DateTimeConversions.php';
/**
 * Represents a static (e.g. ogv/mp4) movie generated by Helioviewer
 *
 * Note: For movies, it is easiest to work with Unix timestamps since that is what is returned
 *       from the database. To get from a javascript Date object to a Unix timestamp, simply
 *       use "date.getTime() * 1000." (getTime returns the number of miliseconds)
 *
 * @category Movie
 * @package  Helioviewer
 * @author   Keith Hughitt <keith.hughitt@nasa.gov>
 * @author   Jaclyn Beck <jaclyn.r.beck@gmail.com>
 * @license  http://www.mozilla.org/MPL/MPL-1.1.html Mozilla Public License 1.1
 * @link     http://launchpad.net/helioviewer.org
 */
class Movie_HelioviewerMovie
{
    private $_startTime;
    private $_endTime;
    private $_frames;
    private $_numFrames;
    private $_frameRate;
    private $_roi;
    private $_directory;
    private $_filename;
    private $_padDimensions;
    private $_watermarkOptions = "-x 720 -y 965 ";

    /**
     * HelioviewerMovie Constructor
     *
     * @param int    $startTime Requested movie start time (unix timestamp)
     * @param int    $numFrames Number of frames to include
     * @param int    $frameRate Number of frames per second
     * @param string $filename  Movie filename without any extension
     * @param int    $quality   Movie quality
     * @param String $dir       The directory where the movie will be stored
     */
    public function __construct($startTime, $numFrames, $frameRate, $filename, $roi, $dir)
    {
        $this->_roi        = $roi;
        $this->_startTime  = $startTime;
        $this->_numFrames  = $numFrames;
        $this->_frameRate  = $frameRate;

        $this->_directory = $dir;
        $this->_filename  = $filename;

        // 11/18/2010 Not currently in use
        //$this->_padDimensions = $this->_setAspectRatios();
    }

    /**
     * Builds the requested movie
     *
     * Makes a temporary directory to store frames in, calculates a timestamp for every frame, gets the closest
     * image to each timestamp for each layer. Then takes all layers belonging to one timestamp and makes a movie frame
     * out of it. When done with all movie frames, phpvideotoolkit is used to compile all the frames into a movie.
     *
     * @param array  $builtImages An array of built movie frames (in the form of HelioviewerScreenshot objects)
     *
     * @return void
     */
    public function build($builtImages)
    {
        $this->_frames = $builtImages;

        // Create and FFmpeg encoder instance
        $ffmpeg = new Movie_FFMPEGWrapper($this->_frameRate);

        // Width and height must be divisible by 2 or ffmpeg will throw an error.
        $width  = round($this->_roi->getPixelWidth());
        $height = round($this->_roi->getPixelHeight());

        $width  += ($width  % 2 === 0) ? 0 : 1;
        $height += ($height % 2 === 0) ? 0 : 1;

        // TODO 11/18/2010: add 'ipod' option to movie requests in place of the 'hqFormat' param
        $ipod = false;

        if ($ipod) {
            $ffmpeg->createIpodVideo($this->_directory, $this->_filename, "mp4", $width, $height);
        }

        // Create an H.264 video using an MPEG-4 (mp4) container format
        $ffmpeg->createVideo($this->_directory, $this->_filename, "mp4", $width, $height);

        //Create alternative container format options (.mov and .flv)
        $ffmpeg->createAlternativeVideoFormat($this->_directory, $this->_filename, "mp4", "mov");
        $ffmpeg->createAlternativeVideoFormat($this->_directory, $this->_filename, "mp4", "flv");

        $this->_cleanup();
    }

    /**
     * Returns the base filepath for movie without any file extension
     */
    public function getFilepath()
    {
        return $this->_directory . "/" . $this->_filename;
    }

    /**
     * Unlinks all images except the first frame used to create the video.
     *
     * @return void
     */
    private function _cleanup ()
    {
        $preview = array_shift($this->_frames);
        rename($preview, $this->_directory . "/" . $this->_filename . ".jpg");
        
        // Clean up movie frame images that are no longer needed
        foreach ($this->_frames as $image) {
            if (file_exists($image)) {
                unlink($image);
            }
        }

        rmdir($this->_directory . "/frames");
        touch($this->_directory . "/READY");
    }

    /**
     * Adds black border to movie frames if neccessary to guarantee a 16:9 aspect ratio
     *
     * Checks the ratio of width to height and adjusts each dimension so that the
     * ratio is 16:9. The movie will be padded with a black background in JP2Image.php
     * using the new width and height.
     *
     * @return array Width and Height of padded movie frames
     */
    private function _setAspectRatios()
    {
        $width  = $this->_roi->getPixelWidth();
        $height = $this->_roi->getPixelHeight();

        $ratio = $width / $height;

        // Commented out because padding the width looks funny.
        /*
        // If width needs to be adjusted but height is fine
        if ($ratio < 16/9) {
        $adjust = (16/9) * $height / $width;
        $width *= $adjust;
        }
        */
        // Adjust height if necessary
        if ($ratio > 16/9) {
            $adjust = (9/16) * $width / $height;
            $height *= $adjust;
        }

        $dimensions = array("width" => $width, "height" => $height);
        return $dimensions;
    }

    /**
     * Displays movie in a Flash player along with a link to the high-quality version
     *
     * @return string HTML containing a Flash video player with the generated movie loaded
     */
    public function getMoviePlayerHTML()
    {
        $url = str_replace(HV_ROOT_DIR, HV_WEB_ROOT_URL, $this->getFilepath() . ".flv");
        ?>
<!-- MC Media Player -->
<script type="text/javascript">
            playerFile = "http://www.mcmediaplayer.com/public/mcmp_0.8.swf";
            fpFileURL = "<?php print $url?>";
            playerSize = "<?php print $this->_roi->getPixelWidth() . 'x' . $this->_roi->getPixelHeight()?>";
        </script>
<script type="text/javascript" src="http://www.mcmediaplayer.com/public/mcmp_0.8.js">
        </script>
<!-- / MC Media Player -->
        <?php
    }
}
?>
