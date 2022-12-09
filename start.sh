
export DEMO_APP_SIGNATURE_CERT_PRIVATE_KEY=./ssl/your-sample-app-private-key.pem
export MYINFO_CONSENTPLATFORM_SIGNATURE_CERT_PUBLIC_CERT=./ssl/staging-myinfo-public-cert.pem

export CREDILINQ_IRIS_CLIENT_ID=2YNyl3vqi34C2g2gPznVAB4K8ByOMBlK
export CREDILINQ_IRIS_CLIENT_SECRET=74hKwP7BDhw5Laf5-ZLG8jHnQiuKUzWM5qzkmx_NoF-bZNBz_znAYSPf9Ot_aLK4

# SANDBOX ENVIRONMENT 
export CREDILINQ_API='https://sandbox.iris.credilinq.ai/api'
CREDILINQ_TOKEN='https://credilinq.au.auth0.com/oauth/token'

# PRODUCTION ENVIRONMENT
# export CREDILINQ_API='https://iris.credilinq.ai/api/'
# export CREDILINQ_TOKEN='https://credilinq.au.auth0.com/oauth/token'
npm start