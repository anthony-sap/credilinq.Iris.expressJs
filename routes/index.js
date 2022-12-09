var express = require('express');
var router = express.Router();
;

const path = require('path');
const url = require('url');
const util = require('util');
const Promise = require('bluebird');
const _ = require('lodash');
const querystring = require('querystring');
const securityHelper = require('../lib/securityHelper');
const requestHandler = require('../lib/requestHandler');
const crypto = require('crypto');
var fs = require('fs');
const { get } = require('lodash');
const cache = require('persistent-cache');
const JWT = require('jwt-decode');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";


// ####################
// Setup Configuration
// ####################
// LOADED FRON ENV VARIABLE: your client_id provided to you during onboarding
var _clientId = process.env.CREDILINQ_IRIS_CLIENT_ID;
// LOADED FRON ENV VARIABLE: your client_secret provided to you during onboarding
var _clientSecret = process.env.CREDILINQ_IRIS_CLIENT_SECRET;



// LOADED FRON ENV VARIABLE: public key from MyInfo Consent Platform given to you during onboarding for RSA digital signature
var _publicCertContent = process.env.MYINFO_CONSENTPLATFORM_SIGNATURE_CERT_PUBLIC_CERT;
// LOADED FRON ENV VARIABLE: your private key for RSA digital signature
var _privateKeyContent = process.env.DEMO_APP_SIGNATURE_CERT_PRIVATE_KEY;

// redirect URL for your web application
var _redirectUrl = process.env.MYINFO_APP_REDIRECT_URL;

// URLs for MyInfo APIs
var _authLevel = process.env.AUTH_LEVEL;
var _apiUrl = process.env.CREDILINQ_API;
var _tokenApiUrl = process.env.CREDILINQ_TOKEN;
var _tokenAudience = process.env.CREDILINQ_IRIS_API_AUDIENCE;
// var _personApiUrl = process.env.MYINFOBIZ_API_PERSON;

const tokenCache = cache({
    persist: true,
    base: 'cache'
});


/* GET home page. */
router.get('/', function (req, res, next) {
    res.sendFile(path.join(__dirname + '/../views/html/index.html'));
});


router.get('/refresh', function (req, res, next) {
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(__dirname + '/../views/html/index.html'));
});

router.get('/customerById/:partnerCustomerId', function (req, res, next) {
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');

    if (!req.params)
        return res.send("NO PARAMS PASSED")
    if (!req.params.partnerCustomerId)
        return res.send("NO partner customer id provided")

    callGetPartnerCustomerById(req)

});
function callGetPartnerCustomerById(req) {
    //successful.return data back to frontend
    getPartnerCustomerById(req.params.partnerCustomerId).then((response) => {
        var partnerCustomerData = response.msg;
        if (partnerCustomerData == undefined || entitypersonData == null) {
            res.jsonp({
                status: "ERROR",
                msg: "Partner Customer Id not found"
            });
        } else {

            console.log("Entity-Person Data (JWE):".green);
            console.log(partnerCustomerData);

            response.jsonp(partnerCustomerData);
        } // end else
    }).catch(err => {
        console.log(err);
        console.log("Error from Entity-Person API:".red);
        console.log(err.statusCode);
        console.log(err.msg.error);
        res.json({
            status: "ERROR",
            msg: err
        });
    })
    // t2step5 END PASTE CODE
}
// function to prepare request and call Get Partner Customer By Id
function getPartnerCustomerById(partnerCustomerId) {
    var validToken = getAccessToken();
    var url = _apiUrl + "/" + "lms/v1/Customers/partnerCustomerId/";
    var cacheCtl = "no-cache";
    var method = "GET";

    var strParams = "partnerCustomerId=" + partnerCustomerId;

    // assemble headers for Entity-Person API
    var strHeaders = "Cache-Control=" + cacheCtl;
    var headers = querystring.parse(strHeaders);
    var authHeaders;

    // Sign request and add Authorization Headers
    // t3step2b PASTE CODE BELOW
    authHeaders = securityHelper.generateAuthorizationHeader(
        url,
        strParams,
        method,
        "", // no content type needed for GET
        _authLevel,
        _clientId,
        _privateKeyContent,
        _clientSecret
    );

    // t3step2b END PASTE CODE
    if (!_.isEmpty(authHeaders)) {
        _.set(headers, "Authorization", authHeaders + ",Bearer " + validToken);
    } else {
        // NOTE: include access token in Authorization header as "Bearer " (with space behind)
        _.set(headers, "Authorization", "Bearer " + validToken);
    }

    var parsedPersonUrl = new URL(url);

    var partnerCustomerApiResponse = requestHandler.getHttpsResponse(parsedPersonUrl.hostname, parsedPersonUrl.pathname + "?" + strParams, headers, method, null);
    return partnerCustomerApiResponse;
}

function getAccessToken() {
    return new Promise((resolve, reject) => {
        var _accessToken = null;
        var data = tokenCache.getSync('accessToken.cache');
        if (data != undefined || data != null) {
            _accessToken = data;
            resolve(_accessToken);
        } else {
            var token = callTokenApi().then((response) => {
                var data = JSON.parse(response.msg);
                var accessToken = data.access_token;
                if (accessToken == undefined || accessToken == null) {
                    reject("ACCESS TOKEN NOT FOUND")
                } else {
                    tokenCache.putSync('accessToken.cache', accessToken);
                }
                resolve(_accessToken);
            }).catch(err => {
                return err;
            });
        }
    });
}


// // function for frontend to call backend
router.get('/partnerCustomers', function (req, res, next) {
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    getAccessToken().then((response) => {
        if (response == undefined || response == null) {
            res.jsonp({
                status: "ERROR",
                msg: "ACCESS TOKEN NOT FOUND"
            });
        }
        var accessToken = response;
        // Call Get Partner Customers
        callGetPartnerCustomers(accessToken, res);

    }).catch(err => {
        console.log('in here-------------------');
        console.log(err);
        console.log("Error from Token API:".red);
        console.log(err.statusCode);
        console.log(err.msg);
        // console.log(callErr.response.req.res.text);
        res.json({
            status: "ERROR",
            msg: err.msg
        });
    });
});


function callGetPartnerCustomers(accessToken, res) {
    // **** CALL Get Partner Customers ****
    // Call Entity-Person API using accessToken
    getPartnerCustomers(accessToken).then((response) => {
        var entitypersonData = response.msg;
        if (entitypersonData == undefined || entitypersonData == null) {
            res.jsonp({
                status: "ERROR",
                msg: "ENTITY-PERSON DATA NOT FOUND"
            });
        } else {
            // console.log("Entity-Person Data (JWE):".green);
            // console.log(entitypersonData);
            res.json(entitypersonData);
            //         res.jsonp({
            //             status: "OK",
            //             text: decodedEntityPersonData
            //         });


        } // end else
    }).catch(err => {
        console.log(err);
        // reject(err);
        //res.status(err.statusCode).send(err.msg);
    })

}
// function to prepare request and call ENTITY-PERSON API
function getPartnerCustomers(validToken) {
    var decoded = JWT(validToken);
    if (decoded == null || decoded == undefined || !('http://credilinq.ai/claims/partnerid' in decoded))
        return "error"
    var partnerId = decoded['http://credilinq.ai/claims/partnerid'];

    var url = _apiUrl + "/lms/v1/customers/partner/" + partnerId;
    var cacheCtl = "no-cache";
    var method = "GET";
    // assemble params for Entity-Person API
    // t2step6 PASTE CODE BELOW

    var strParams = "";//"partnerId=" + partnerId;
    var params = querystring.parse(strParams);

    // assemble headers for Entity-Person API
    var strHeaders = "Cache-Control=" + cacheCtl;
    var headers = querystring.parse(strHeaders);
    var authHeaders;

    // Sign request and add Authorization Headers
    // t3step2b PASTE CODE BELOW
    authHeaders = securityHelper.generateAuthorizationHeader(
        url,
        params,
        method,
        "", // no content type needed for GET
        _authLevel,
        _clientId,
        _privateKeyContent,
        _clientSecret
    );

    // t3step2b END PASTE CODE
    if (!_.isEmpty(authHeaders)) {
        _.set(headers, "Authorization", authHeaders + ",Bearer " + validToken);
    } else {
        // NOTE: include access token in Authorization header as "Bearer " (with space behind)
        _.set(headers, "Authorization", "Bearer " + validToken);
    }


    var parsedPersonUrl = new URL(url);

    var entityPersonApiResponse = requestHandler.getHttpsResponse(parsedPersonUrl.hostname, parsedPersonUrl.pathname + "?" + strParams, headers, method, null);

    return entityPersonApiResponse;
}

// function to prepare request and call TOKEN API
function callTokenApi() {
    var cacheCtl = "no-cache";
    var contentType = "application/x-www-form-urlencoded";
    var method = "POST";

    // preparing the request with header and parameters
    // t2step3 PASTE CODE BELOW
    // assemble params for Token API
    var strParams = "grant_type=client_credentials" +
        "&client_id=" + _clientId +
        "&client_secret=" + _clientSecret +
        "&audience=" + _tokenAudience;
    var params = querystring.parse(strParams);

    // assemble headers for Token API
    var strHeaders = "Content-Type=" + contentType + "&Cache-Control=" + cacheCtl;
    var headers = querystring.parse(strHeaders);

    var parsedTokenUrl = new URL(_tokenApiUrl);

    var tokenApiResponse = requestHandler.getHttpsResponse(parsedTokenUrl.hostname, parsedTokenUrl.pathname, headers, method, params);
    // t2step3 END PASTE CODE

    return tokenApiResponse;
}

module.exports = router;