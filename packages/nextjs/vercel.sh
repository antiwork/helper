#!/bin/bash

(cd ../react && npm run build)

if [[ $VERCEL_ENV == "production"  ]] ; then 
  npm run deploy
else 
  npm run build:preview
fi
