// @ts-ignore running in node context, missing type def
import fs from "fs";
import area from "@turf/area";
import booleanIntersects from "@turf/boolean-intersects";
import {
  polygon,
  multiPolygon,
  Feature,
  FeatureCollection,
  Polygon,
  MultiPolygon,
} from "@turf/helpers";

import fdrJson from "../../files/fdr.json" assert { type: "json" };
import districtJson from "../../files/districts.json" assert { type: "json" };
// @ts-ignore BBox type conflict with inferred JSON type
const fdrGeoJson = fdrJson as FeatureCollection<Polygon, { GRIDCODE: number }>;
// @ts-ignore BBox type conflict with inferred JSON type
const districtGeoJson = districtJson as FeatureCollection<
  Polygon | MultiPolygon,
  { FEDENAME: string; GRIDAREAS?: any }
>;

const getGeometryForType = (geoFeature: Feature<Polygon | MultiPolygon>) => {
  const { coordinates, bbox, type } = geoFeature.geometry;
  switch (type) {
    case "Polygon":
      return polygon(coordinates, geoFeature.properties, { bbox });
    case "MultiPolygon":
      return multiPolygon(coordinates, geoFeature.properties, { bbox });
    default:
      console.warn("skipping geojson feature that is not a polygon", type);
      return;
  }
};

const mapDistrictsToRatings = () => {
  console.log("start");
  const districtCount = districtGeoJson.features.length;
  return districtGeoJson.features.map((geoFeature, index) => {
    console.log("district", index + 1, "of", districtCount);
    const districtPoly = getGeometryForType(geoFeature);
    if (!districtPoly) {
      console.warn("failed to find district for geoFeature");
      return geoFeature;
    }
    const gridZones = fdrGeoJson.features.filter((geoFeature) => {
      if (geoFeature.geometry.type !== "Polygon") {
        console.warn(
          "skipping geojson feature that is not a polygon",
          geoFeature
        );
        return;
      }

      const { coordinates, bbox } = geoFeature.geometry;
      const fdrPoly = polygon(coordinates, geoFeature.properties, { bbox });

      return booleanIntersects(districtPoly, fdrPoly);
    });

    const gridAreas = gridZones
      .map((zoneFeature) => {
        return {
          gridCode: zoneFeature.properties.GRIDCODE,
          area: area(zoneFeature),
        };
      })
      .reduce(
        (acc, { gridCode, area }) => ({
          ...acc,
          totalArea: acc.totalArea + area,
          [gridCode]: acc[gridCode as 0 | 1 | 2 | 3 | 4] + area,
        }),
        { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, totalArea: 0 }
      );

    geoFeature.properties.GRIDAREAS = gridAreas;
    return geoFeature;
  });
};

const districtFdrs = mapDistrictsToRatings();
fs.writeFileSync("files/district-fdrs.json", JSON.stringify(districtFdrs));
