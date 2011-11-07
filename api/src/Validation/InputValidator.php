<?php
/* vim: set expandtab tabstop=4 shiftwidth=4 softtabstop=4: */
/**
 * Helioviewer InputValidator Class Definition
 *
 * PHP version 5
 *
 * @category Helper
 * @package  Helioviewer
 * @author   Keith Hughitt <keith.hughitt@nasa.gov>
 * @license  http://www.mozilla.org/MPL/MPL-1.1.html Mozilla Public License 1.1
 * @link     http://launchpad.net/helioviewer.org
 */
/**
 * Helioviewer InputValidator Class
 *
 * A class which helps to validate and type-case input
 *
 * @category Helper
 * @package  Helioviewer
 * @author   Keith Hughitt <keith.hughitt@nasa.gov>
 * @license  http://www.mozilla.org/MPL/MPL-1.1.html Mozilla Public License 1.1
 * @link     http://launchpad.net/helioviewer.org
 */
class Validation_InputValidator
{
    /**
     * Validates and type-casts API Request parameters
     *
     * TODO 02/09/2009: Create more informative exception classes:
     *  InvalidInputException, MissingRequiredParameterException, etc.
     *
     * @param array &$expected Types of checks required for request
     * @param array &$input    Actual request parameters
     * @param array &$optional Array to store optional parameters in
     *
     * @return void
     */
    public static function checkInput(&$expected, &$input, &$optional)
    {
        // Validation checks
        $checks = array(
            "required" => "checkForMissingParams",
            "alphanum" => "checkAlphaNumericStrings",
            "ints"     => "checkInts",
            "floats"   => "checkFloats",
            "bools"    => "checkBools",
            "dates"    => "checkDates",
            "urls"     => "checkURLs",
            "files"    => "checkFilePaths",
            "uuids"    => "checkUUIDs"
        );

        // Run validation checks
        foreach ($checks as $name => $method) {
            if (isset($expected[$name])) {
                Validation_InputValidator::$method($expected[$name], $input);
            }
        }

        // Create array of optional parameters
        if (isset($expected["optional"])) {
            Validation_InputValidator::checkOptionalParams($expected["optional"], $input, $optional);
        }
    }

    /**
     * Checks to make sure all required parameters were passed in.
     *
     * @param array $required A list of the required parameters for a given action
     * @param array &$params  The parameters that were passed in
     *
     * @return void
     */
    public static function checkForMissingParams($required, &$params)
    {
        foreach ($required as $req) {
            if (!isset($params[$req])) {
                throw new Exception("No value set for required parameter \"$req\".");
            }
        }
    }

    /**
     * Checks optional parameters and sets those which were not included to null
     *
     * Note that optional boolean parameters are set to "false" if they are not
     * found by the checkBools method.
     *
     * @param array $optional A list of the optional parameters for a given action
     * @param array &$params  The parameters that were passed in
     * @param array &$options Array to store any specified optional parameters in
     *
     * @return void
     */
    public static function checkOptionalParams($optional, &$params, &$options)
    {
        foreach ($optional as $opt) {
            if (isset($params[$opt])) {
                $options[$opt] = $params[$opt];
            }
        }
    }
    
    /**
     * Checks alphanumeric entries to make sure they do not include invalid characters
     * 
     * @param array $strings A list of alphanumeric parameters which are used by an action.
     * @param array &$params The parameters that were passed in
     * 
     * @return void
     */
    public static function checkAlphaNumericStrings($strings, &$params)
    {
        foreach ($strings as $str) {
            if (isset($params[$str])) {
                if (!preg_match('/^[a-zA-Z0-9]*$/', $params[$str])) {
                    throw new Exception(
                        "Invalid value for $str. Valid strings must consist of only letters and numbers."
                    );
                }
            }
        }
    }

    /**
     * Typecasts boolean strings or unset optional params to booleans
     *
     * @param array $bools   A list of boolean parameters which are used by an action.
     * @param array &$params The parameters that were passed in
     *
     * @return void
     */
    public static function checkBools($bools, &$params)
    {
        foreach ($bools as $bool) {
            if (isset($params[$bool])) {
                if ((strtolower($params[$bool]) === "true") || $params[$bool] === "1") {
                    $params[$bool] = true;
                } elseif ((strtolower($params[$bool]) === "false") || $params[$bool] === "0") {
                    $params[$bool] = false;
                } else {
                    throw new Exception("Invalid value for $bool. Please specify a boolean value.");
                }
            }
        }
    }
    
    /**
     * Checks filepaths to check for attempts to access parent directories
     * 
     * @param array $files   Filepaths that should be validated
     * @param array &$params The parameters that were passed in
     * 
     * @return void
     */
    public static function checkFilePaths($files, &$params)
    {
        foreach ($files as $file) {
            if (isset($params[$file])) {
                if (strpos($params[$file], '..')) {
                    throw new Exception("Invalid file requested: .. not allowed in filenames.");
                } elseif (preg_match('/[^\/.-\w]/', $params[$file])) {
                    throw new Exception(
                        "Invalid file requested. Valid characters for filenames include letters, " .
                        "digits, underscores, hyphens and periods."
                    );
                }
            }
        }
    }

    /**
     * Typecasts validates and fixes types for integer parameters
     *
     * @param array $ints    A list of integer parameters which are used by an action.
     * @param array &$params The parameters that were passed in
     *
     * @return void
     */
    public static function checkInts($ints, &$params)
    {
        foreach ($ints as $int) {
            if (isset($params[$int])) {
                if (filter_var($params[$int], FILTER_VALIDATE_INT) === false) {
                    throw new Exception("Invalid value for $int. Please specify an integer value.");
                } else {
                    $params[$int] = (int) $params[$int];
                }
            }
        }
    }

    /**
     * Typecasts validates and fixes types for float parameters
     *
     * @param array $floats  A list of float parameters which are used by an action.
     * @param array &$params The parameters that were passed in
     *
     * @return void
     */
    public static function checkFloats($floats, &$params)
    {
        foreach ($floats as $float) {
            if (isset($params[$float])) {
                if (filter_var($params[$float], FILTER_VALIDATE_FLOAT) === false) {
                    throw new Exception("Invalid value for $float. Please specify an float value.");
                } else {
                    $params[$float] = (float) $params[$float];
                }
            }
        }
    }
    
    /**
     * Validates UUIDs
     *
     * @param array $uuids   A list of uuids which are used by an action.
     * @param array &$params The parameters that were passed in
     *
     * @return void
     */
    public static function checkUUIDs($uuids, &$params)
    {
        foreach ($uuids as $uuid) {
            if (isset($params[$uuid])) {
                if (!preg_match('/^[a-z0-9]{8}-?[a-z0-9]{4}-?[a-z0-9]{4}-?[a-z0-9]{4}-?[a-z0-9]{12}$/', $params[$uuid])) {
                    throw new Exception(
                        "Invalid identifier. Valid characters for UUIDs include " .
                        "lowercase letters, digits, and hyphens."
                    );
                }
            }
        }
    }

    /**
     * Typecasts validates URL parameters
     *
     * @param array $urls    A list of URLs which are used by an action.
     * @param array &$params The parameters that were passed in
     *
     * @return void
     */
    public static function checkURLs($urls, &$params)
    {
        foreach ($urls as $url) {
            if (isset($params[$url])) {
                if (!filter_var($params[$url], FILTER_VALIDATE_URL)) {
                    throw new Exception("Invalid value for $url. Please specify an URL.");
                }
            }
        }
    }

    /**
     * Checks an array of UTC dates
     *
     * @param array $dates   dates to check
     * @param array &$params The parameters that were passed in
     *
     * @return void
     */
    public static function checkDates($dates, &$params)
    {
        foreach ($dates as $date) {
            if (isset($params[$date])) {
                Validation_InputValidator::checkUTCDate($params[$date]);
            }
        }
    }

    /**
     * Checks to see if a string is a valid ISO 8601 UTC date string of the form
     * "2003-10-05T00:00:00.000Z" (milliseconds and ending "Z" are optional).
     *
     * @param string $date A datestring
     *
     * @return void
     */
    public static function checkUTCDate($date)
    {
        //if (!preg_match("/^\d{4}[\/-]\d{2}[\/-]\d{2}T\d{2}:\d{2}:\d{2}\.\d{0,3}Z?$/i", $date)) {
        if (!preg_match("/^\d{4}[\/-]\d{2}[\/-]\d{2}T\d{2}:\d{2}:\d{2}.\d{0,3}Z?$/i", $date)) {
            throw new Exception("Invalid date string. Please enter a date of the form 2003-10-06T00:00:00.000Z");
        }
    }
}
?>