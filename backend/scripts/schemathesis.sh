#!/bin/bash
# Run Schemathesis via Docker against the local backend
# Requires: Docker, backend running on port 5000
#
# Usage: bash scripts/schemathesis.sh

docker run --rm --network=host \
  schemathesis/schemathesis:stable \
  run http://localhost:5000/swagger.json \
  --checks all \
  --hypothesis-max-examples 50 \
  --report
