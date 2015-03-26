<?php

/**
 *  \details © 2014  Open Ximdex Evolution SL [http://www.ximdex.org]
 *
 *  Ximdex a Semantic Content Management System (CMS)
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU Affero General Public License as published
 *  by the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU Affero General Public License for more details.
 *
 *  See the Affero GNU General Public License for more details.
 *  You should have received a copy of the Affero GNU General Public License
 *  version 3 along with Ximdex (see LICENSE file).
 *
 *  If not, visit http://gnu.org/licenses/agpl-3.0.html.
 *
 *  @author Ximdex DevTeam <dev@ximdex.com>
 *  @version $Revision$
 */
class XowlStanbolService
{

    const ENCODING = "UTF-8";
    const URL_STRING = "";
    //Default response format
    const RESPONSE_FORMAT = "application/json";

    private static $IS_SEMANTIC = 1;
    protected static $XIMDEX_TYPE_DPERSON = "dPerson";
    protected static $XIMDEX_TYPE_DORGANISATION = "dOrganisation";
    protected static $XIMDEX_TYPE_DPLACE = "dPlace";
    protected static $XIMDEX_TYPES = array(
        'dbp-ont:Person' => 'dPerson',
        'dbp-ont:Place' => 'dPlace',
        'dbp-ont:Organisation' => 'dOrganisation'
    );
    
    protected $data;
    protected $endpoint;

    public function __construct($endpoint)
    {
        $this->setEndpoint($endpoint);
    }

    public function setEndpoint($endpoint) {
        if(filter_var($endpoint, FILTER_VALIDATE_URL) == FALSE) {
            throw new InvalidArgumentException($endpoint." is not a valid URL");
        }
        
        $this->endpoint = $endpoint;
    }
    
    public function getEndpoint() {
        return $this->endpoint;
    }
    
    /**
     * <p>Query the server with the default response format (application/json)</p>
     * @param unknown_type $text
     */
    public function suggest($text)
    {
        return $this->query($text, self::RESPONSE_FORMAT);
    }

    /**
     * <p>Get the loaded datas in several formats</p>
     * @param $format output format for data: array or json is waited.
     * @return false if there aren't data. Json or array otherwise.
     */
    public final function getData($format = null)
    {

        if (!$this->data)
            return false;
        switch (strtolower($format)) {
            case "json":
                return json_encode($this->data);
            case "array":
            default:
                return $this->data;
        }
    }

    /**
     * <p>Send petition to stanbol server and returns the parsed response	</p>
     * @param unknown_type $text
     * @param unknown_type $format
     * @return this. 
     */
    private function query($text, $format)
    {

        $headers = array(
            //To remove HTTP 100 Continue messages
            'Expect' => '',
            //Response Format
            'Accept' => $format,
            //Content-Type. We should use text/html but there are some complications while parsing in order to highlight the mentions
            'Content-Type' => 'text/plain');

        $response = $this->doRequest('POST', $text, $headers);
        
        if ($response->code != 200) {
            return NULL;
        }

        $data = $response->data;
        $this->data = $this->parseData($data, $text);
        return $this;
    }

    /**
     * <p>Performs the real request</p>
     * @param string $method The HTTP method
     * @param string $data The data to be enhanced
     * @param array $headers The headers to be put in the request
     * @return StdClass An Object containing the response (code, data, etc)
     */
    private function doRequest($method, $data = NULL, $headers = array())
    {
        //$content = http_build_query(array('content' => $data));
        $options = array(
            'headers' => $headers,
            'method' => $method,
            'data' => $data
        );

        $response = drupal_http_request($this->endpoint, $options);

        return $response;
    }

    /**
     * 
     * <p>Parse response data from stanbol server. JSON Format default.</p>
     * @param string|json $data The data in JSON format to be parsed
     * @param string $text The text being processed
     * 
     * @return an array containing the mentions of the text and their related entities
     */
    private function parseData($data, $text)
    {
        if (function_exists('json_decode')) {
            $data = json_decode($data, true);
        } else {
            return NULL;
        }

        $result = array();
        $result['semantic'] = array();
        
        foreach ($data as $key => $values) {
            if (strcmp("@graph", $key) == 0) { //only analyze the @graph object
                foreach ($values as $key => $value) {
                    // Processing Text Annotations
                    if (isset($value['@type']) && (in_array("enhancer:TextAnnotation", $value['@type']) || in_array("TextAnnotation", $value['@type']))) {
                            $prefix = in_array("enhancer:TextAnnotation", $value['@type']) ? "enhancer:" : "";
                            
                            
                            $start = intval($value[$prefix.'start']);
                            $end = intval($value[$prefix.'end']);
                            
                            if($start > 0) {
                                $prevChar = $text{$start-1};
                                $prevPrevChar = $text{$start-2};
                                $postChar = $text{$end};

                                // Checking if the mention is <mention> or </mention> or <mention> or </mention> because we are going to skip mentions which can have the form of an HTML tag
                                if(($postChar === "\n") || ($prevChar === "\n") || (($prevChar === "<" || ($prevChar === "/" && $prevPrevChar === "<")) && $text{$end} === ">") || (($prevChar === ";" || ($prevChar === "/" && $prevPrevChar === ";")) && $text{$end} === "&") ){
                                    // Skipping mention processing because it represents a html tag
                                    continue;
                                }
                            }
                            $entities = $this->retrieveEntities($value["@id"], $values, $prefix);
                            
                            // If there aren't entities (Entity Annotations) related to this text annotation, skip it
                            if(0 === count($entities)) {
                                continue;
                            }
                           
                            $textAnnotation = array();
                            $textAnnotation['selected-text'] = $value[$prefix.'selected-text']['@value'];
                            $textAnnotation['text'] = $value[$prefix.'selected-text']['@value'];
                            $textAnnotation['start'] = $value[$prefix.'start'];
                            $textAnnotation['end'] = $value[$prefix.'end'];
                            $textAnnotation['confidence'] = $value[$prefix.'confidence'] ? $value[$prefix.'confidence'] : 0;
                            $textAnnotation['entities'] = $entities;
                            
                            array_push($result['semantic'], $textAnnotation);
                    }
                }
                
                usort($result['semantic'], function($ta1, $ta2) {
                    $start1 = intval($ta1['start']);
                    $start2 = intval($ta2['start']);
                    
                    if ($start1 === $start2) {
                        return 0;
                    }

                    return ($start1 > $start2) ? 1 : -1;
                });
            }
        }
        
        return $result;
    }

    /**
     * <p>Extracts the possible entities for the text annotation</p>
     *
     * @param string $textAnnotationId The id of the text annotation to extract the entities
     * @param array $values The model containing the enhancement information
     *
     * @return an array containing the possible entities
     */
    private function retrieveEntities($textAnnotationId, $values, $prefix= '')
    {
        $entities = array();
        $dcPrefix = $prefix !== '' ? 'dc:' : '';
        foreach ($values as $value) {
            if (isset($value["@type"]) && in_array($prefix."EntityAnnotation", $value["@type"]) && isset($value[$dcPrefix."relation"]) && ((is_array($value[$dcPrefix."relation"]) && in_array($textAnnotationId, $value[$dcPrefix."relation"])) || (!is_array($value[$dcPrefix."relation"]) && strcmp($value[$dcPrefix."relation"], $textAnnotationId) === 0))) {
                $dereferencedEntity = $this->getDereferencedEntity($value[$prefix."entity-reference"], $values);
                if(null === $dereferencedEntity) {
                    continue;
                }

                $entity["uri"] = $dereferencedEntity["@id"];
                $entity["confidence"] = $value[$prefix."confidence"];
                $entity["label"] = is_array($value[$prefix."entity-label"]) ? $value[$prefix."entity-label"]["@value"] : $value[$prefix."entity-label"];
                
                $dbpediaType = $this->getDbpediaEntityType($dereferencedEntity["@type"]);
                if(null === $dbpediaType ) {
                    continue;
                }
                
                $entity["type"] = $dbpediaType;
                array_push($entities, $entity);
            }
        }

        usort($entities, function($e1, $e2) {
            $confidence = floatval($e1["confidence"]);
            $otherConfidence = floatval($e2["confidence"]);
            if ($confidence == $otherConfidence) {
                return strcmp($e1["uri"], $e2["uri"]);
            }

            return ($confidence > $otherConfidence) ? -1 : 1;
        }
        );
        return $entities;
    }
    
    /**
     * <p>Gets the real entity object</p>
     * 
     * @param string $entityUri The URI of the entity to be looked for
     * @param array $values An array containing text annotations, entity annotations and entities
     * @return array An array containing the properties of the searched entity or null if the dereferenced entity is not found in the array of values
     */
    private function getDereferencedEntity($entityUri, $values) {
        $entity = null;
        foreach($values as $value) {
            if($value["@id"] === $entityUri) {
                $entity = $value;
                break;
            }
        }
        
        return $entity;
    }

    /**
     * <p>Returns only the dbpedia type regardint to person, places and organisations</p>
     * @param array $types The types of the entity
     * @return the DBPedia entity type (dbp-ont:person, dbp-ont:place, dbp-ont:Organisation) or null if no DBPedia entity type is found
     */
    private function getDbpediaEntityType($types)
    {
        $types = is_array($types) ? $types : array($types);
        foreach($types as $type) {
            switch ($type) {
                case "dbp-ont:Person":
                case "dbp-ont:Place":
                case "dbp-ont:Organisation":
                    return self::$XIMDEX_TYPES[$type];
            }

        }
        
        /* No DBPedia type found */
        return "others";

    }

}
?>


