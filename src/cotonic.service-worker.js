/**
 * Copyright 2016-2023 The Cotonic Authors. All Rights Reserved.
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

"use strict";

self.addEventListener('install', (event) => {
    event.waitUntil( self.skipWaiting() );
});

self.addEventListener('activate', (event) => {
    event.waitUntil( self.clients.claim() );
});

self.addEventListener('fetch', (event) => {
    // Firefox 88 is failing downloads for large requests over slower
    // connections if the service worker handles the fetch event.
    // Temporarily disabled the code below to fix this issue.
    //
    // if (   !event.request.headers.get('range')
    //     && !event.request.headers.get('x-no-cache')) {
    //     // fetch drops the 'range' header, which is used
    //     // with video and audio requests.
    //     event.respondWith( fetch( event.request ) );
    // }
});

self.addEventListener('message', (event) => {
    switch (event.data.type)  {
        case "broadcast":
            // Relay broadcast messages
            const message = event.data;
            message.sender_id = event.source.id;

            event.waitUntil(messageClients(message));
            break;
        default:
            console.info("Service Worker: unknown message", event);
    }
});

self.addEventListener('push', (event) => {
    const message = event.data.json();

    switch(message.type) {
        case "notification":
            const data = message.data;
            self.registration.showNotification(data.title, data.options);
            break;
        default:
            console.info("Service Worker: unknown push message", event);
    }
});

self.addEventListener("notificationclick", (event) => {
    const notification = event.notification;
    const localURL = ensureLocalURL(notification.data?notification.data.url:undefined);
    event.waitUntil(focusWindow(localURL));
});


// Try to focus a tab with the given url. When such a tab is not found,
// a new one will be opened.
function focusWindow(url)  {
    return clients.matchAll({ type: "window" })
        .then((clientList) => {
            // Check if there already is a tab with has this url open.
            for(const client of clientList) {
                if((client.url === url) && ('focus' in client)) {
                    return client.focus();
                }
            }

            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        });
}

// Relay a message to all clients (including the sender)
function messageClients( message ) {
    return self.clients.matchAll()
        .then((clientList) => {
            clientList.forEach((client) => {
                client.postMessage(message);
            })
        });
}

// Ensure that a local url is returned to prevent cross
// origin navigations from a notification.
function ensureLocalURL(url) {
    let parsed;

    if(url) {
        parsed = new URL(url, self.origin);
    }

    if((parsed === undefined) || (parsed.origin !== self.origin)) {
        parsed = new URL("/", self.origin);
    }

    return parsed.toJSON();
}
