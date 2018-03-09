/**
 * Copyright 2018 The Cotonic Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* Originial code from https://github.com/RangerMauve/mqtt-pattern */

"use strict";

var cotonic = cotonic || {};

(function(cotonic) {
    
    const SEPARATOR = "/";
    const SINGLE = "+";
    const ALL = "#";


    function exec(pattern, topic) {
	return matches(pattern, topic) ? extract(pattern, topic) : null;
    }

    function matches(pattern, topic) {
	var patternSegments = pattern.split(SEPARATOR);
	var topicSegments = topic.split(SEPARATOR);

	var patternLength = patternSegments.length;
	var topicLength = topicSegments.length;
	var lastIndex = patternLength - 1;

	for(var i = 0; i < patternLength; i++){
	    var currentPattern = patternSegments[i];
	    var patternChar = currentPattern[0];
	    var currentTopic = topicSegments[i];

            if(!currentTopic && !currentPattern)
                continue;

	    if(!currentTopic && currentPattern !== ALL) return false;

	    // Only allow # at end
	    if(patternChar === ALL)
		return i === lastIndex;
	    if(patternChar !== SINGLE && currentPattern !== currentTopic)
		return false;
	}

	return patternLength === topicLength;
    }

    function fill(pattern, params){
	var patternSegments = pattern.split(SEPARATOR);
	var patternLength = patternSegments.length;

	var result = [];

	for (var i = 0; i < patternLength; i++) {
	    var currentPattern = patternSegments[i];
	    var patternChar = currentPattern[0];
	    var patternParam = currentPattern.slice(1);
	    var paramValue = params[patternParam];

	    if(patternChar === ALL){
		// Check that it isn't undefined
		if(paramValue !== void 0)
		    result.push([].concat(paramValue).join(SEPARATOR)); // Ensure it's an array

		// Since # wildcards are always at the end, break out of the loop
		break;
	    } else if (patternChar === SINGLE)
		// Coerce param into a string, missing params will be undefined
		result.push("" + paramValue);
	    else result.push(currentPattern);
	}

	return result.join(SEPARATOR);
    }


    function extract(pattern, topic) {
	var params = {};
	var patternSegments = pattern.split(SEPARATOR);
	var topicSegments = topic.split(SEPARATOR);

	var patternLength = patternSegments.length;

	for(var i = 0; i < patternLength; i++){
	    var currentPattern = patternSegments[i];
	    var patternChar = currentPattern[0];

	    if(currentPattern.length === 1)
		continue;

	    if(patternChar === ALL){
		params[currentPattern.slice(1)] = topicSegments.slice(i);
		break;
	    } else if(patternChar === SINGLE){
		params[currentPattern.slice(1)] = topicSegments[i];
	    }
	}

	return params;
    }

    function remove_named_wildcards(pattern) {
	var patternSegments = pattern.split(SEPARATOR);
	var patternLength = patternSegments.length;
        var mqttPattern = [];

	for(var i = 0; i < patternLength; i++) {
	    var currentPattern = patternSegments[i];
	    var patternChar = currentPattern[0];

            if(patternChar === ALL || patternChar == SINGLE) {
                mqttPattern.push(patternChar);
            } else {
                mqttPattern.push(currentPattern);
            }
        }

        return mqttPattern.join(SEPARATOR);
    }

    cotonic.mqtt = cotonic.mqtt || {};
    cotonic.mqtt.matches = matches;
    cotonic.mqtt.extract = extract;
    cotonic.mqtt.exec = exec;
    cotonic.mqtt.fill = fill;
    cotonic.mqtt.remove_named_wildcards = remove_named_wildcards;
 
})(cotonic);
