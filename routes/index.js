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
const { red } = require('colors');

var validators = require("../lib/validators");
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


// URLs for MyInfo APIs
var _authLevel = process.env.AUTH_LEVEL;
var _apiUrl = process.env.CREDILINQ_API;
var _tokenApiUrl = process.env.CREDILINQ_TOKEN;
var _tokenAudience = process.env.CREDILINQ_IRIS_API_AUDIENCE;

const tokenCache = cache({
    persist: true,
    base: 'cache'
});


/* GET home page. */
router.get('/', function (req, res, next) {
    res.sendFile(path.join(__dirname + '/../views/html/index.html'));
});

/* Gets the Customers for a Partner */
router.get('/customers/partner', async function (req, res, next) {
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    await callGetPartnerCustomers(req, res, false);
});

/* Gets Customer by PartnerCustomerId */
router.get('/customers/partnerCustomerId/:partnerCustomerId', async function (req, res, next) {
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    if (!req.params)
        return res.send("NO PARAMS PASSED")
    if (!req.params.partnerCustomerId)
        return res.send("NO partner customer id provided")
    await callGetCustomerByPartnerCustomerId(req, res, req.params.partnerCustomerId, false);
});

/* Gets the customers Dashboard */
router.get('/customerDashboard/:partnerCustomerId', async function (req, res, next) {
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    if (!req.params)
        return res.send("NO PARAMS PASSED")
    if (!req.params.partnerCustomerId)
        return res.send("NO partner customer id provided")
    await callgetCustomerDashboard(req, res, req.params.partnerCustomerId, false);
});

/* Gets Loans for a Customer */
router.get('/customers/partnerCustomerId/:partnerCustomerId/drawdownrequests', async function (req, res, next) {
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    if (!req.params)
        return res.send("NO PARAMS PASSED")
    if (!req.params.partnerCustomerId)
        return res.send("NO partner customer id provided")
    await callGetCustomerLoans(req, res, req.params.partnerCustomerId, false);
});

/* Gets Acitve Loans for partner */
router.get('/LoanApplications/:partnerId/active', async function (req, res, next) {
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    if (!req.params)
        return res.send("NO PARAMS PASSED")
    if (!req.params.partnerId)
        return res.send("No partner id provided")
    await callGetPartnerActiveLoans(req, res, req.params.partnerId, false);
});

/* Requests a Drawdown */
router.post('/loan-drawdown/:partnerCustomerId', async function (req, res, next) {
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');

    // merge the body and params and validate if everything required is provided
    var validationResult = validators.drawdownSchema.validate({ ...req.body, ...req.params });
    if (validationResult.error && validationResult.error.details) {
        res.json(validationResult.error.details);
    }
    // validation passed let's do our API Call
    await callLoanDrawdown(req, res, req.params.partnerCustomerId, req.body, false);
});

/* Records a Disbursal */
router.post('/loan-disburse/:partnerCustomerId', async function (req, res, next) {
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    console.log(req.body);
    if (!req.params)
        return res.send("NO PARAMS PASSED")
    if (!req.body)
        return res.send("NO body")
    if (!req.params.partnerCustomerId)
        return res.send("NO partner customer id provided");
    await callLoanDisburse(req, res, req.params.partnerCustomerId, req.body, false);
});

/* Records a Repayment */
router.post('/loan-repay/:partnerCustomerId', async function (req, res, next) {
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    console.log(req.body);
    if (!req.params)
        return res.send("NO PARAMS PASSED")
    if (!req.body)
        return res.send("NO body")
    if (!req.params.partnerCustomerId)
        return res.send("NO partner customer id provided");
    await callLoanRepay(req, res, req.params.partnerCustomerId, req.body, false);
});


async function callGetPartnerCustomers(req, res, retryToken = false) {
    accessToken = await getAccessToken();
    var decoded = JWT(accessToken);
    if (decoded == null || decoded == undefined || !('http://credilinq.ai/claims/partnerid' in decoded))
        return "error"
    var partnerId = decoded['http://credilinq.ai/claims/partnerid'];

    var url = _apiUrl + "/lms/v1/customers/partner/" + partnerId;
    var strParams = "";
    //return getPartnerCustomers(accessToken);
    callCreditLinqAPi("GET", accessToken, url, strParams, null).then((response) => {
        //var responseData = response.data;
        if (response == undefined || response == null) {
            res.end();
        } else {
            res.setHeader('Content-Type', 'application/json')
            res.end(response);
        } // end else
    }).catch(err => {
        // if 401, try to flush the token and get it again only if we have a retryToken flag as false otherwise we're retrying it and only want to do it once, this is our
        // exit condition to prevent infinite recursion.s
        if (err.statusCode == 401 && retryToken == false) {
            // clear the token cache so we can go and retrieve a new fresh one that will give us data back.
            clearTokenFromCache();
            return callGetPartnerCustomers(req, res, true);
        } else {
            res.status(err.statusCode).json(err.data.error);
        }
    });
}

async function callGetCustomerByPartnerCustomerId(req, res, partnerCustomerId, retryToken = false) {
    accessToken = await getAccessToken();

    var url = _apiUrl + "/lms/v1/customers/partnerCustomerId/" + partnerCustomerId;
    var strParams = "";
    //return getPartnerCustomers(accessToken);
    callCreditLinqAPi("GET", accessToken, url, strParams, null).then((response) => {
        //var responseData = response.data;
        if (response == undefined || response == null) {
            res.end();
        } else {
            res.setHeader('Content-Type', 'application/json')
            res.end(response);
        } // end else
    }).catch(err => {
        // if 401, try to flush the token and get it again only if we have a retryToken flag as false otherwise we're retrying it and only want to do it once, this is our
        // exit condition to prevent infinite recursion.s
        if (err.statusCode == 401 && retryToken == false) {
            // clear the token cache so we can go and retrieve a new fresh one that will give us data back.
            clearTokenFromCache();
            return callGetCustomerByPartnerCustomerId(req, res, partnerCustomerId, true);
        } else {
            res.status(err.statusCode).json(err.data.error);
        }
    });
}

async function callGetCustomerLoans(req, res, partnerCustomerId, retryToken = false) {
    accessToken = await getAccessToken();

    var url = _apiUrl + "/lms/v1/customers/partnerCustomerId/" + partnerCustomerId + "/drawdownrequests";
    var strParams = "";
    //return getPartnerCustomers(accessToken);
    callCreditLinqAPi("GET", accessToken, url, strParams, null).then((response) => {
        //var responseData = response.data;
        if (response == undefined || response == null) {
            res.end();
        } else {
            res.setHeader('Content-Type', 'application/json')
            res.end(response);
        } // end else
    }).catch(err => {
        // if 401, try to flush the token and get it again only if we have a retryToken flag as false otherwise we're retrying it and only want to do it once, this is our
        // exit condition to prevent infinite recursion.s
        if (err.statusCode == 401 && retryToken == false) {
            // clear the token cache so we can go and retrieve a new fresh one that will give us data back.
            clearTokenFromCache();
            return callGetCustomerLoans(req, res, partnerCustomerId, true);
        } else {
            res.status(err.statusCode).json(err.data.error);
        }
    });
}

async function callGetPartnerActiveLoans(req, res, partnerId, retryToken = false) {
    accessToken = await getAccessToken();

    var url = _apiUrl + "/lms/v1/LoanApplications/" + partnerId + "/active";
    var strParams = "";
    //return getPartnerCustomers(accessToken);
    callCreditLinqAPi("GET", accessToken, url, strParams, null).then((response) => {
        //var responseData = response.data;
        if (response == undefined || response == null) {
            res.end();
        } else {
            res.setHeader('Content-Type', 'application/json')
            res.end(response);
        } // end else
    }).catch(err => {
        // if 401, try to flush the token and get it again only if we have a retryToken flag as false otherwise we're retrying it and only want to do it once, this is our
        // exit condition to prevent infinite recursion.s
        if (err.statusCode == 401 && retryToken == false) {
            // clear the token cache so we can go and retrieve a new fresh one that will give us data back.
            clearTokenFromCache();
            return callGetPartnerActiveLoans(req, res, partnerId, true);
        } else {
            res.status(err.statusCode).json(err.data.error);
        }
    });
}

async function callgetCustomerDashboard(req, res, partnerCustomerId, retryToken = false) {
    // **** CALL Get Partner dashboard ****
    console.log("CALL Get Partner dashboard");
    accessToken = await getAccessToken();
    var url = _apiUrl + "/lms/v1/partner/Dashboard/" + partnerCustomerId;
    var strParams = "";
    //return getPartnerCustomers(accessToken);
    console.log('calling');
    callCreditLinqAPi("GET", accessToken, url, strParams, null).then((response) => {
        //var responseData = response.data;
        console.log(response);
        if (response == undefined || response == null) {
            res.end();
        } else {
            res.setHeader('Content-Type', 'application/json')
            res.end(response);
        } // end else
    }).catch(err => {
        console.log(err);
        // if 401, try to flush the token and get it again only if we have a retryToken flag as false otherwise we're retrying it and only want to do it once, this is our
        // exit condition to prevent infinite recursion.s
        if (err.statusCode == 401 && retryToken == false) {
            // clear the token cache so we can go and retrieve a new fresh one that will give us data back.
            clearTokenFromCache();
            return callgetCustomerDashboard(req, res, partnerCustomerId, true);
        } else {
            res.status(err.statusCode).json(err.data.error);
        }
    });
}

/* NOT TESTED*/
async function callLoanDrawdown(req, res, partnerCustomerId, drawdown, retryToken = false) {
    // **** POST LOAN DRAWDOWN ****
    accessToken = await getAccessToken();
    var url = _apiUrl + "/v1/customers/" + partnerCustomerId + "/drawdown";
    var strParams = "";
    //return getPartnerCustomers(accessToken);
    callCreditLinqAPi("POST", accessToken, url, strParams, drawdown, null).then((response) => {
        if (response == undefined || response == null) {
            res.end();
        } else {
            res.setHeader('Content-Type', 'application/json')
            res.end(response);
        } // end else
    }).catch(err => {
        // if 401, try to flush the token and get it again only if we have a retryToken flag as false otherwise we're retrying it and only want to do it once, this is our
        // exit condition to prevent infinite recursion.s
        if (err.statusCode == 401 && retryToken == false) {
            // clear the token cache so we can go and retrieve a new fresh one that will give us data back.
            clearTokenFromCache();
            return callLoanDrawdown(req, res, partnerCustomerId, drawdown, true);
        } else {
            console.log(res);
            res.status(err.statusCode).json(err.data.error);
        }
    });
}

/* NOT TESTED*/
async function callLoanRepay(req, res, partnerCustomerId, repay, retryToken = false) {
    // **** POST LOAN REPAY ****
    accessToken = await getAccessToken();
    var url = _apiUrl + "/v1/customers/" + partnerCustomerId + "/repay";
    var strParams = "";
    //return getPartnerCustomers(accessToken);
    callCreditLinqAPi("POST", accessToken, url, strParams, repay, null).then((response) => {
        if (response == undefined || response == null) {
            res.end();
        } else {
            res.setHeader('Content-Type', 'application/json')
            res.end(response);
        } // end else
    }).catch(err => {
        // if 401, try to flush the token and get it again only if we have a retryToken flag as false otherwise we're retrying it and only want to do it once, this is our
        // exit condition to prevent infinite recursion.s
        if (err.statusCode == 401 && retryToken == false) {
            // clear the token cache so we can go and retrieve a new fresh one that will give us data back.
            callLoanRepay();
            return callLoanDrawdown(req, res, partnerCustomerId, drawdown, true);
        } else {
            res.status(err.statusCode).json(err.data.error);
        }
    });
}

/* NOT TESTED*/
async function callLoanDisburse(req, res, partnerCustomerId, disburse, retryToken = false) {
    // **** POST LOAN Disburse ****
    accessToken = await getAccessToken();
    var url = _apiUrl + "/v1/customers/" + partnerCustomerId + "/disburse";
    var strParams = "";
    callCreditLinqAPi("POST", accessToken, url, strParams, disburse, null).then((response) => {
        if (response == undefined || response == null) {
            res.end();
        } else {
            res.setHeader('Content-Type', 'application/json')
            res.end(response);
        } // end else
    }).catch(err => {
        // if 401, try to flush the token and get it again only if we have a retryToken flag as false otherwise we're retrying it and only want to do it once, this is our
        // exit condition to prevent infinite recursion.s
        if (err.statusCode == 401 && retryToken == false) {
            // clear the token cache so we can go and retrieve a new fresh one that will give us data back.
            clearTokenFromCache();
            return callLoanDisburse(req, res, partnerCustomerId, drawdown, true);
        } else {
            res.status(err.statusCode).json(err.data.error);
        }
    });
}

// function to prepare request and call 
async function callCreditLinqAPi(method, validToken, url, strParams, body) {
    var cacheCtl = "no-cache";
    // assemble params 

    var strParams = "";

    // assemble headers 
    var strHeaders = "Cache-Control=" + cacheCtl + "&Content-Type=application/json";
    var headers = querystring.parse(strHeaders);

    // NOTE: include access token in Authorization header as "Bearer " (with space behind)
    _.set(headers, "Authorization", "Bearer " + validToken);

    var parsedUrl = new URL(url);

    var apiResponse = requestHandler.getHttpsResponse(parsedUrl.hostname, parsedUrl.pathname + "?" + strParams, headers, method, body);
    return apiResponse;
}

/* ACCESS TOKEN AND CACHE RELATED */
function getAccessToken() {
    return new Promise((resolve, reject) => {
        var _accessToken = null;
        var data = tokenCache.getSync('accessToken.cache');
        if (data) {
            _accessToken = data;
            resolve(_accessToken);
        } else {
            var token = callTokenApi().then((response) => {
                var data = JSON.parse(response);
                var accessToken = data.access_token;
                if (accessToken == undefined || accessToken == null) {
                    reject("ACCESS TOKEN NOT FOUND")
                } else {
                    tokenCache.putSync('accessToken.cache', accessToken);
                }
                resolve(accessToken);
            }).catch(err => {
                return err;
            });
        }
    });
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

    return tokenApiResponse;
}

function clearTokenFromCache() {
    console.log('clearing cache');
    tokenCache.putSync('accessToken.cache', '');
}

module.exports = router;