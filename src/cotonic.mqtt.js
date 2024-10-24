/**
 * Copyright 2018-2024 The Cotonic Authors. All Rights Reserved.
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

const SEPARATOR = "/";
const SINGLE = "+";
const ALL = "#";

function exec(pattern, topic) {
    return matches(pattern, topic) ? extract(pattern, topic) : null;
}

function matches(pattern, topic) {
    const patternSegments = pattern.split(SEPARATOR);
    const topicSegments = topic.split(SEPARATOR);

    const patternLength = patternSegments.length;
    const topicLength = topicSegments.length;
    const lastIndex = patternLength - 1;

    for(let i = 0; i < patternLength; i++){
        const currentPattern = patternSegments[i];
        const patternChar = currentPattern[0];
        const currentTopic = topicSegments[i];

        if(!currentTopic && !currentPattern)
            continue;

        if(!currentTopic && currentPattern !== ALL)
            return false;

        // Only allow # at end
        if(patternChar === ALL)
            return i === lastIndex;
        if(patternChar !== SINGLE && currentPattern !== currentTopic)
            return false;
    }

    return patternLength === topicLength;
}

function fill(pattern, params){
    const patternSegments = pattern.split(SEPARATOR);
    const patternLength = patternSegments.length;

    const result = [];

    for (let i = 0; i < patternLength; i++) {
        const currentPattern = patternSegments[i];
        const patternChar = currentPattern[0];
        const patternParam = currentPattern.slice(1);
        const paramValue = params[patternParam];

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
    const params = {};
    const patternSegments = pattern.split(SEPARATOR);
    const topicSegments = topic.split(SEPARATOR);

    const patternLength = patternSegments.length;

    for(let i = 0; i < patternLength; i++){
        const currentPattern = patternSegments[i];
        const patternChar = currentPattern[0];

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
    const patternSegments = pattern.split(SEPARATOR);
    const patternLength = patternSegments.length;
    const mqttPattern = [];

    for(let i = 0; i < patternLength; i++) {
        const currentPattern = patternSegments[i];
        const patternChar = currentPattern[0];

        if(patternChar === ALL || patternChar == SINGLE) {
            mqttPattern.push(patternChar);
        } else {
            mqttPattern.push(currentPattern);
        }
    }

    return mqttPattern.join(SEPARATOR);
}

export { matches, extract, exec, fill, remove_named_wildcards };
