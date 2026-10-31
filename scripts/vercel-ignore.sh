#!/bin/bash
# Only auto-deploy on main. All other branches require manual deploy from Vercel dashboard.
if [ "$VERCEL_GIT_COMMIT_REF" = "main" ]; then
  exit 1  # proceed with build
else
  echo "Skipping auto-deploy for branch: $VERCEL_GIT_COMMIT_REF (only main auto-deploys)"
  exit 0  # skip build
fi
