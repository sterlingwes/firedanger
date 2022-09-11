#!/bin/bash

SINCE_DATE=$(date '+%b %d %Y')

curl -z "$SINCE_DATE" https://cwfis.cfs.nrcan.gc.ca/downloads/fire_danger/fdr.zip --output files/fdr.zip

node scripts/convert-geojson.js > files/fdr.json
