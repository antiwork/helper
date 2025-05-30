#!/bin/bash

(cd ../react && pnpm run build)
(cd packages/marketing && pnpm run build)

if [[ $VERCEL_ENV == "production"  ]] ; then 
  pnpm run deploy
else 
  pnpm run build:preview
fi
