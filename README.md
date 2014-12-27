# vanilli
[![Build Status](https://travis-ci.org/kelveden/vanilli.png?branch=master)](https://travis-ci.org/kelveden/vanilli)

Manages a RESTful server running on Nodejs for storing, matching and verifying stubs/expectations from a test run.

## Installation

    npm install vanilli

## How It Works
Vanilli is designed to act as a "fake" version of the REST services that your SUT (System Under Test) depends on. It sits running
on a port you specify, waiting to serve up responses that you specify via adding stubs. Stubs are added and verified via the
javascript API.

Your SUT is then configured to call vanilli instead of the REST services it usually uses.

Note: If your web app has client-side code that makes XHR calls to REST services then you will need to consider the section on 'CORS' below.

## Usage
Typical usage:

    var vanilli = require('vanilli').init();

    describe('My SUT', function () {
        before(function () {
            vanilli.listen(port); // Start the vanilli REST server
        });

        after(function () {
            vanilli.stop(); // Shutdown vanilli REST server
        });

        afterEach(function () {
            vanilli.verify(); // Verify all expectations have been met
            vanilli.clear(); // Clear down stubs from vanilli ready for next test
        });

        it('does something', function (done) {
            vanilli.stub(
                vanilli.onGet("/this/url/MIGHT/happen").respondWith(200)
            );

            vanilli.expect(
                vanilli.onGet("/this/url/MUST/happen").respondWith(200)
            );

            // Manipulate SUT to required state

            // Make assertions

            // Note that the vanilli expectation above will be verified by the vanilli.verify() in 'afterEach'.
        });
    });

## Configuration
Vanilli configuration is handled via the `init()` function. See the API documentation below for more information.

## Lazy Matching
Vanilli's matching logic is lazy - i.e. a as long as ALL the criteria on a given stub match an incoming
request vanilli does not care about any further details of that request. So, for example, if one specifies
a stub that matches on a specific query parameter then the matching logic ONLY cares about that query
parameter - any other query parameters are considered irrelevant.

This approach means more succinct stubs and less matching criteria irrelevant to the test at hand.

## CORS
Vanilli will usually be running on a different port to your SUT. So, if your SUT's client-side code makes calls calls to REST services
then you'll need to take advantage of the vanilli support for [CORS](http://en.wikipedia.org/wiki/Cross-origin_resource_sharing).

Vanilli sends out CORS headers in all responses:

    Access-Control-Allow-Origin: *
    Access-Control-Allow-Headers: <See lib/cors.js for a list of the supported headers>
    Access-Control-Allow-Methods: <HTTP methods for all the stubs for the resource that vanilli knows about>;

*IMPORTANT*: This reliance on CORS means that the browser that you are running your tests on MUST support and be configured to support CORS.

## JSONP
Vanilli stub responses will automatically be wrapped in JSONP if either a "callback" or "jsonp" query string parameter
is found on the request that the stub response is being produced for. This is not explicitly handled in vanilli but by its
underlying [restify](http://mcavage.me/node-restify/) server instead.

## Diagnostics
Vanilli logs to sysout and syserr via [bunyan](https://github.com/trentm/node-bunyan). Switching `logLevel` to `debug` will cause
vanilli to spit out a whole load of diagnostic information relating to what stubs are stored and how it is matching stubs against
incoming requests.

See the [bunyan](https://github.com/trentm/node-bunyan) project itself for more info on logging and log levels.

## Stubs vs Expectations
For vanilli, an "expectation" is simply a specialized stub. In short: a stub MIGHT be matched; an
expectation MUST be matched.

A stub...
 * CAN be matched UP TO the specified number of times (1 if not explicitly specified).
 * WILL cause an error if matched too many times.
 * WILL NOT cause an error if matched too few times.

An expectation...
 * MUST be matched the specified number of times (1 if not explicitly specified).
 * WILL cause an error if matched too many times.
 * WILL cause an error if matched too few times.

So, if you want to assert on the actual calls that your SUT is using use an expectation;
otherwise use a stub.

*REMEMBER*: The more vanilli expectations you add to your tests the more brittle they will get:
consider using stubs as your first choice.

## Static Content
To serve up the stubbed responses vanilli is, at its core, an HTTP server. This means that it could, potentially,
serve up content other than stubs.

So, to this end, the `static` config option was created. It acts like a "pass through" filter - if
an incoming request matches the static filter then the static content will be served rather than
attempting to match against a stub. The option takes the form:

    {
        static: {
            root: "sut/static/root",
            include: [ glob1, glob2, ... , globX ],
            exclude: [ globA, globB, ... , globZ ]
        }
    }

You can see an example in (test/e2e/vanilli-test.js)

## API
*NOTE*: You can find examples of the API calls in (test/e2e/vanilli-test.js) and (test/unit/vanilli-test.js).

### init
    var vanilli = require('vanilli').init([config]);

Creates a new vanilli instance. Optional configuration values can be specified. All options are
given below with their default values:

    {
        logLevel: "error", // See 'Diagnostics' section above
        static: undefined // See 'Static Content' section above
    }

### vanilli.stub
    vanilli.stub(stub1, stub2, ... , stubX);

Registers one or more stubs.

### vanilli.expect
    vanilli.expect(stub1, stub2, ... , stubX);

Registers one or more stubs as expectations. (See 'Stubs vs Expectations' section below.)

### vanilli.onGet
    vanilli.onGet(url[, options]);

Returns a new stub that will match against an incoming GET request with a relative URL matching
that specified. Further matching criteria can be specified via the options object. The following
snippet illustrates all available options:

    {
        contentType: <string or RegExp>,
        body: <string, object or RegExp>,
        query: {
            param1: <string or RegExp>,
            ...
            paramX: <string or RegExp>
        },
        headers: {
            header1: <string or RegExp>,
            ...
            headerX: <string or RegExp>
        },
    }

*NOTE*: If a `body` is specified then a `contentType` MUST be specified.

### vanilli.onPut
As for `vanilli.onGet` except that the HTTP method for the stub is PUT.

### vanilli.onPost
As for `vanilli.onGet` except that the HTTP method for the stub is POST.

### vanilli.onDelete
As for `vanilli.onGet` except that the HTTP method for the stub is DELETE.

### vanilli.listen
    vanilli.listen(port);

Starts the vanilli REST server listening on the specified port.

### vanilli.stop
    vanilli.stop();

Stops the vanilli REST server.

### vanilli.verify
    vanilli.verify();

Verifies that the expectations currently registered with vanilli have been met. If verification fails
a single error is thrown detailing all unmet expectations.

### vanilli.clear
    vanilli.clear();

Clears vanilli down of all stubs and expectations.

### vanilli.getCapture
    var captureDetails = vanilli.getCapture(captureId);

Gets details of the request indicated by the specified captureId. (See `stub.capture`.)

### stub.capture
    stub.capture(captureId);

Indicates that vanilli should store the details of the request that is eventually matched against
the stub. The specified captureId can then be used as a handle to `vanilli.getCapture` to pull
those details back for asserting on.

### stub.wait
    stub.wait(milliseconds);

Indicates that when vanilli matches this stub against an incoming request it should wait the specified
number of milliseconds before responding with the stubbed response.

### stub.respondWith
    stub.respondWith(status[, options]);

Adds details of the response to the stub. At minimum, a status code can be specified; however, more
details for the response can be specified via the options. The following snippet illustrates all options.

    {
        contentType: <string>,
        body: <string or object>,
        headers: {
            header1: <string>,
            ...
            headerX: <string>
        }
    }

*NOTE*: If a `body` is specified then a `contentType` MUST be specified.
