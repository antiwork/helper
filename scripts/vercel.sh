#!/bin/bash

if [[ $VERCEL_ENV == "production"  ]] ; then 
  pnpm run deploy
else 
  pnpm run build:preview
fi
