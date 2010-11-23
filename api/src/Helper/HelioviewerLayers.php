<?php
/* vim: set expandtab tabstop=4 shiftwidth=4 softtabstop=4: */
/**
 * Helper_HelioviewerLayers Class Definition
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
 * A simple class to represent one or more Helioviewer layers in a request. 
 * 
 * @category Helper
 * @package  Helioviewer
 * @author   Keith Hughitt <keith.hughitt@nasa.gov>
 * @license  http://www.mozilla.org/MPL/MPL-1.1.html Mozilla Public License 1.1
 * @link     http://launchpad.net/helioviewer.org
 * @see      http://www.lmsal.com/helio-informatics/hpkb/
 */
class Helper_HelioviewerLayers
{
    private $_layers = array();
    private $_db;
    
    /**
     * Creates a new HelioviewerLayers instance
     * 
     * The constructor accepts a layer string in one of two recognized formats: 
     * [obs,inst,det,meas,visible,opacity] or [sourceId,visible,opacity]. 
     * 
     */
    public function __construct($layerString)
    {
        $this->_db = new Database_ImgIndex();

        $layerStringArray = explode("],[", substr($layerString, 1, -1));

        foreach($layerStringArray as $singleLayerString) {
            array_push($this->_layers, $this->_decodeSingleLayerString($singleLayerString));
        }
    }
    
    /**
     * Returns the number of layers in the collection
     */
    public function length()
    {
        return sizeOf($this->_layers);
    }
    
    /**
     * Returns the layers as an array of associative arrays
     */
    public function toArray()
    {
        return $this->_layers;
    }
    
    /**
     * Returns a string reprentation of the request layers suitable for use in filenames
     */
    public function toString()
    {
        $layerString = "";

        foreach ($this->_layers as $layer) {
            $layerString .= $layer['instrument'] . "_" . $layer['detector'] . "_" . $layer['measurement'] . "__";
        }
        
        // remove trailing __
        return substr($layerString, 0, -2);
    }
    
    /**
     * Takes a single layer string and converts it to a more convenient associative array. filling in any 
     * missing details as neccessary
     * 
     * @param string $layer a single layer represented as a string in one of the two following forms:
     *                      [obs,inst,det,meas,visible,opacity] or [sourceId,visible,opacity] 
     * 
     * @return array Associative array representation of the layer
     */
    private function _decodeSingleLayerString ($layerString)
    {
        // Break up string into individual components
        $layerArray = explode(",", $layerString);
    
        // [obs,inst,det,meas,visible,opacity] 
        if (sizeOf($layerArray) === 6) {
            list($observatory, $instrument, $detector, $measurement, $visible, $opacity) = $layerArray;
            list($sourceId, $layeringOrder) = $this->_db->getSourceIdAndLayeringOrder(
                $observatory, $instrument, $detector, $measurement
            );
    
        // [sourceId,visible,opacity]
        } else if (sizeOf($layerArray === 3)) {
            list($sourceId, $visible, $opacity) = $layerArray;
            list($observatory, $instrument, $detector, $measurement, $layeringOrder) = 
                 $this->_db->getDatasourceInformationFromSourceId($sourceId);
        }
        
        // Associative array form
        return array (
            "observatory"   => $observatory,
            "instrument"    => $instrument,
            "detector"      => $detector,
            "measurement"   => $measurement,
            "sourceId"      => (int)  $sourceId,
            "layeringOrder" => (int) $layeringOrder,
            "visible"       => (bool) $visible,
            "opacity"       => (int)  $opacity
        );
    }
}