@ECHO off

set DEMO_APP_SIGNATURE_CERT_PRIVATE_KEY=./ssl/your-sample-app-private-key.pem
set MYINFO_CONSENTPLATFORM_SIGNATURE_CERT_PUBLIC_CERT=./ssl/staging-myinfo-public-cert.pem

set CREDILINQ_IRIS_CLIENT_ID=2YNyl3vqi34C2g2gPznVAB4K8ByOMBlK
set CREDILINQ_IRIS_CLIENT_SECRET=74hKwP7BDhw5Laf5-ZLG8jHnQiuKUzWM5qzkmx_NoF-bZNBz_znAYSPf9Ot_aLK4

set PARTNER_AUTH_URL=https://iris-dev.credilinq.ai/api/lms/v1/customers/partner/2353246
set PARTNER_AUTH_METHOD=JWT_BEARER

rem TEST ENVIRONMENT 
set CREDILINQ_API=https://iris-dev.credilinq.ai/api
set CREDILINQ_TOKEN=https://credilinq.au.auth0.com/oauth/token
set CREDILINQ_IRIS_API_AUDIENCE=https://dev.credilinq.ai/
rem SANDBOX ENVIRONMENT 
rem set CREDILINQ_API=https://sandbox.iris.credilinq.ai/api
rem set CREDILINQ_TOKEN=https://credilinq.au.auth0.com/oauth/token
rem set CREDILINQ_IRIS_API_AUDIENCE=https://sandbox.credilinq.ai/

rem PRODUCTION ENVIRONMENT
rem set CREDILINQ_API=https://iris.credilinq.ai/api/
rem set CREDILINQ_TOKEN=https://credilinq.au.auth0.com/oauth/token
rem set CREDILINQ_IRIS_API_AUDIENCE=https://credilinq.ai/
npm start