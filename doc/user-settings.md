User settings: Timezone and Language
====================================

Different scenarios.


1. Initial visit
----------------

 * User-Agent fetches page from server
   - Server determines language from the URL
   - If not in URL then from the Accept-Language tag.
   - Server uses timezone from the site configuration
   - Language and timezone are placed in the html tag
   - Set (insecure) cookies with timezone and language
 * User-Agent receives page
   - Copy settings from the cookies (fallback html) to sessionStorage

Q: how to set the local timezone based on the user-agent?
   - Extra setting/cookie: tz-source (fixed, none, ua)

2. Return visit
---------------

 * User-Agent fetches page from server
   - Server determines language from:
     1. URL
     2. Cookie
     3. User-preferences
     4. Accept-Language (if not fixed in site config)
     5. Site config
   - Server determines timezone from:
     1. Cookie
     2. User preferences
     3. Site config


3. User logs on
---------------

 * User-Agent fetches auth token from server
   - Auth response has the language and timezone after logon
   - Auth controller sets language and timezone cookies
 * User-Agent saves Auth response tz and language to sessionStorage


4. Change of language
---------------------

Language can be changed by:

 * New language in request URL and page reload


5. Change of timezone
---------------------

  * If tz-source is not fixed then:
    - User-Agent overwrites timezone cookie and sets the tz-source to 'ua'


6. MQTT
-------

 * On WebSocket connection as any other request
 * As user-headers on CONNECT
 * Publish to topic: bridge/origin/$SYS/[client-id]/setting/[language,timezone]

