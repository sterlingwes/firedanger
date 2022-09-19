#!/bin/bash

SINCE_DATE=$(date '+%b %d %Y')
curl -z "$SINCE_DATE" https://cwfis.cfs.nrcan.gc.ca/downloads/fire_danger/fdr.zip --output files/fdr.zip

echo "fetching FDR for $SINCE_DATE"

if [ -f files/fdr.zip ]
then
  node scripts/convert-geojson.js files/fdr.zip > files/fdr.json

  REF_DATE=$(date '+%F')
  echo "{\"date\":\"$REF_DATE\"}" > files/date.json

else
  echo "No FDR file downloaded for $SINCE_DATE"
  exit 1
fi
