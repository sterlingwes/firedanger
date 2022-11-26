import area from "@turf/area";
import nodemailer from "nodemailer";
import booleanWithin from "@turf/boolean-within";
import booleanIntersects from "@turf/boolean-intersects";
import { point, polygon, FeatureCollection, Polygon } from "@turf/helpers";

import fdrJson from "../../files/fdr.json" assert { type: "json" };
import districtJson from "../../files/districts.json" assert { type: "json" };

// @ts-ignore BBox type conflict with inferred JSON type
const fdrGeoJson = fdrJson as FeatureCollection<Polygon, { GRIDCODE: number }>;
// @ts-ignore BBox type conflict with inferred JSON type
const districtGeoJson = districtJson as FeatureCollection<
  Polygon,
  { FEDENAME: string }
>;

const coords = [45.3932218, -79.3094689];

const findDistrictAndRatings = () => {
  const foundDistrict = districtGeoJson.features.find((geoFeature) => {
    if (geoFeature.geometry.type !== "Polygon") {
      return;
    }

    const [lat, lon] = coords;
    const pos = point([lon, lat]);
    const { coordinates, bbox } = geoFeature.geometry;
    const poly = polygon(coordinates, geoFeature.properties, { bbox });

    return booleanWithin(pos, poly);
  });

  if (!foundDistrict) {
    return;
  }

  console.log({ foundDistrict });

  const districtPoly = polygon(
    foundDistrict.geometry.coordinates,
    foundDistrict.properties,
    { bbox: foundDistrict.geometry.bbox }
  );

  const foundRatingZones = fdrGeoJson.features.filter((geoFeature) => {
    if (geoFeature.geometry.type !== "Polygon") {
      return;
    }

    const { coordinates, bbox } = geoFeature.geometry;
    const fdrPoly = polygon(coordinates, geoFeature.properties, { bbox });

    return booleanIntersects(districtPoly, fdrPoly);
  });

  console.log({ foundRatingZones });

  return foundRatingZones
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
};

const user = process.env.GMAIL_U;
const pass = process.env.GMAIL;
const to = process.env.GMAIL_R;

const sendReport = (result: string) => {
  const transport = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
  });

  const mail = {
    from: user,
    to,
    subject: "firedanger report",
    html: `<pre>${result}</pre>`,
  };

  transport.sendMail(mail, (err, info) => {
    if (err) {
      console.log("failed to send email");
    }

    if (info.rejected.length) {
      console.log("rejected recipient");
    }
  });
};

const result = findDistrictAndRatings();
let weightings;
if (result) {
  const { totalArea } = result;
  weightings = [0, 1, 2, 3, 4].reduce(
    (acc, code) => ({
      ...acc,
      // @ts-expect-error keys are cast to strings at some point
      [code]: result[code.toString()] / totalArea,
    }),
    {} as Record<number, number>
  );
}

const zoneAreaSum = Object.values(result ?? {}).reduce(
  (sum, area) => sum + (typeof area === "number" ? area : 0),
  0
);

if (zoneAreaSum > 0) {
  sendReport(JSON.stringify({ result, weightings }, null, 2));
}
