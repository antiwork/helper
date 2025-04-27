#!/bin/bash
 
if [[ $VERCEL_ENV == "production"  ]] ; then 
  npm run deploy
else 
  npm run build:preview
fi
