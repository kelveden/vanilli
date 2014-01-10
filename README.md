# vanilli

[![Build Status](https://travis-ci.org/kelveden/vanilli.png?branch=master)](https://travis-ci.org/kelveden/vanilli)
[![Dependencies Status](https://david-dm.org/kelveden/vanilli.png?branch=master)](https://david-dm.org/kelveden/vanilli)

> *IMPORTANT*: Before considering using vanilli or milli there is a reliance on CORS that may be a gotcha for you. See the section on CORS below for more info.

A RESTful server running on Nodejs for storing and matching stubs/expectations from a test run.

## Usage
Whilst vanilli exposes a RESTful API (which is documented below), it'll probably make more sense to talk to vanilli from its
javascript client library cousin https://github.com/kelveden/milli. You can also hook starting/shutting vanilli down into your grunt build
with https://github.com/kelveden/grunt-vanilli.

See the milli tests and its Gruntfile.js for an example of how milli, vanilli and grunt-vanilli fit together.

For a simple start script for vanilli see `bin/vanilli`.

## How It Works
Vanilli is designed to act as a "fake" version of the REST service(s) that your SUT depends on. It sits running on a port (say 14000).
Your SUT will be running on another port (say 8080). Most importantly, you will have configured your SUT so that HTTP calls to
REST services go out to port 14000 NOT 8080.

Now, all you need to do is set up stubs in vanilli (i.e. with milli) so that appropriate responses exist when making calls to the
fake REST services.

### CORS
As you might have worked out, this architecture relies heavily on CORS. Vanilli will send out CORS headers in all responses:

    Access-Control-Allow-Origin: *
    Access-Control-Allow-Headers: <See lib/cors.js for a list of the supported headers>
    Access-Control-Allow-Methods: <HTTP methods for all the stubs for the resource that vanilli knows about>;

Extra headers for the `Access-Control-Allow-Headers` header can be added via `config.allowedHeadersForCors` which is a JSON array
of HTTP headers.

> *IMPORTANT*: This reliance on CORS means that the browser that you are running your tests on MUST support and be configured to support CORS.

## Configuration
Vanilli is configured as it started via the `start(config)` function.

    {
        port: <port to run Vanilli on>,
        allowedHeadersForCors: <array containing extra headers to add to the Access-Control-Allow-Headers CORS header in vanilli responses>,
        logLevel: <log level for vanilli; defaults to 'error'>
    }

## Diagnostics
Vanilli logs to sysout and syserr via [bunyan](https://github.com/trentm/node-bunyan). Switching `logLevel` to `debug` will cause vanilli
to spit out a whole load of diagnostic information relating to what stubs are stored and how it is matching stubs against incoming requests.

See the [bunyan](https://github.com/trentm/node-bunyan) project itself for more info on logging and log levels.

## REST API
### GET _vanilli/ping
Produces: _application/json_

Simple ping/pong for the server.

### POST _vanilli/stubs
Consumes: _application/json_

Accepts one or more stubs/expectations for storage.
The body should be a single stub definition OR a JSON array containing one or more stub definitions. A stub definition takes the form
given below. (Note that all fields are optional unless otherwise specified):

    {
        "criteria": {
            "url": _url to match against - can be a string or regex_, -- MANDATORY
            "body": _the request entity body to match against; can be a literal or a regex,
            "contentType": _the request entity content type to match against; i.e. Content-Type header_,
            "query": {
                "_param1_": _expected value; literal or regex_,
                ...
            },
            "headers": {
                "_header1_": _expected value; literal or regex_,
                ...
            }
        },
        "respondWith": {
            "status": _the HTTP status code to respond with_, -- MANDATORY
            "body": _the response entity body_,
            "contentType": _the HTTP Content-Type of the response entity_,
            "headers": {
                "_header1_": _value1_,
                ...
            }
        },
        "expect": true,
        "times": _integer value for use with an expectation indicating how many times to expect a match_
    }

### DEL _vanilli/stubs
Clears down all stubs.

### GET _vanilli/stubs/verification
Produces: _application/json_

Checks that all stubs marked as expectations have been used in responses the expected number of times. All errors are included as a
JSON array in the response body. An empty array indicates no errors.

### GET _vanilli/captures/:captureId
Produces: _application/json_

Retrieves details of the body caught for the specified capture id.

## Installation

Installation is done via npm:

``` bash
$ npm install vanilli
```

Vanilli is designed to be kicked off as a step in your grunt build; so the typical usage will actually be via a plugin; e.g.
https://github.com/kelveden/grunt-vanilli.

However, if you do want to start it up manually you can find an example startup script in the bin folder of the source. I recommend
you pipe the sysout through bunyan to get your log output nicely formatted and colourised:

``` bash
$ bin/vanilli.sh | bunyan
```


[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/kelveden/vanilli/trend.png)](https://bitdeli.com/free "Bitdeli Badge")

