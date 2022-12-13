const requestHandler = require('./requestHandler');
const querystring = require('querystring');
const securityHelper = require('./securityHelper');
const _ = require('lodash');

exports.parterAuthCheck = async function (req, res, next) {

    var passAuthOnPartner = false;

    if (req.headers.authorization) {
        authHeader = req.headers.authorization;
        switch (process.env.PARTNER_AUTH_METHOD) {
            case 'JWT_BEARER':
                if (authHeader.startsWith("Bearer ")) {
                    token = authHeader.substring(7, authHeader.length);
                    // do the check with the partner AuthURL and see if our response is true/false 
                    // we get false on a 401 with partner URL otherwise it's true. If true we want to allow this API call to progress.
                    var response = await doBearerTokenCheck(token);
                    if (response) {
                        passAuthOnPartner = true;
                    }
                }
                break;
            case 'BASIC':
                console.log('we have basic');
                break;
            default:
                console.log('we have nothing');
                break;
        }
    }

    if (passAuthOnPartner === false) {
        res.sendStatus(401);
    } else {        
        next();
    }
};

function doBearerTokenCheck(token) {
    var url = process.env.PARTNER_AUTH_URL;
    var cacheCtl = "no-cache";
    var method = "GET";

    // assemble headers for Entity-Person API
    var strHeaders = "Cache-Control=" + cacheCtl;
    var headers = querystring.parse(strHeaders);

    _.set(headers, "Authorization", "Bearer " + token);

    var parsedUrl = new URL(url);

    var response = requestHandler.getHttpsResponse(parsedUrl.hostname, parsedUrl.pathname + "?", headers, method, null).then((response) => {
        // we got a response so return true
        return true;
    }).catch(err => {
        if (err.statusCode == 200) {
            // we got  a success response so we're good anything else is a problem. 
            return true;            
        }
        else{
            false;
        }
        
    }).then((response) => {
        // this handles the catch returning true/false as it hasn't thrown an error
        return response;
    });
    // return the response promise.
    return response;
}
