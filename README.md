# vanilli

[![Build Status](https://travis-ci.org/kelveden/vanilli.png?branch=master)](https://travis-ci.org/kelveden/vanilli)
[![Dependencies Status](https://david-dm.org/kelveden/vanilli.png?branch=master)](https://david-dm.org/kelveden/vanilli)

> IMPORTANT: In it's *very* early stages. Expect the goalposts to move. A lot.

A RESTful server running on Nodejs for storing and matching stubs/expectations from a test run.

## Usage
Whilst vanilli exposes a RESTful API (which is documented below), it'll probably make more sense to talk to vanilli from its
javascript client library cousin https://github.com/kelveden/milli. You can also hook starting/shutting vanilli down into your grunt build
with https://github.com/kelveden/grunt-vanilli.

See the milli tests and its Gruntfile.js for an example of how milli, vanilli and grunt-vanilli fit together.

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
        criteria: {
            url: _url to match against - can be a string or regex_, -- MANDATORY
            body: _the request entity body to match against; can be a literal or a regex,
            contentType: _the request entity content type to match against; i.e. Content-Type header_,
            query: {
                _param1_: _expected value; literal or regex_,
                ...
            },
            headers: {
                _header1_: _expected value; literal or regex_,
                ...
            }
        },
        respondWith: {
            status: _the HTTP status code to respond with_, -- MANDATORY
            body: _the response entity body_,
            contentType: _the HTTP Content-Type of the response entity_,
            headers: {
                _header1_: _value1_,
                ...
            }
        },
        expect: true,
        times: _integer value for use with an expectation indicating how many times to expect a match_
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
