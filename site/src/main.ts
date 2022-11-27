import area from "@turf/area";
import booleanWithin from "@turf/boolean-within";
import booleanIntersects from "@turf/boolean-intersects";
import { point, polygon, FeatureCollection, Polygon } from "@turf/helpers";

import "./style.css";
import "./map";
import fdrMeta from "../../files/date.json";
import fdrJson from "../../files/fdr.json";
import districtJson from "../../files/districts.json";
import { dangerColours, dangerLabel, DangerRating } from "./constants";

// @ts-ignore BBox type conflict with inferred JSON type
const fdrGeoJson = fdrJson as FeatureCollection<Polygon, { GRIDCODE: number }>;
const districtGeoJson = districtJson as FeatureCollection<
  Polygon,
  { FEDENAME: string }
>;

const { date } = fdrMeta;
const currentYear = new Date().getFullYear();
const infoDiv = document.getElementById("map-info") ?? { innerHTML: "" };

infoDiv.innerHTML = `\
Last updated ${date} • \
Canadian Forest Service. ${currentYear}. \
<a href="http://cwfis.cfs.nrcan.gc.ca">Canadian Wildland Fire Information System (CWFIS)</a>, Natural Resources Canada, Canadian Forest Service, Northern Forestry Centre, Edmonton, Alberta.\
`;

const body = document.getElementsByTagName("body")[0];
let toast: HTMLDivElement | undefined;
let toastAnimating = false;
const toastAnimTiming = 500;

const showToast = (message: string) => {
  toast = document.createElement("div");
  toast.classList.add("toast");
  toast.innerHTML = message;
  toastAnimating = true;
  body.appendChild(toast);
};

const hideToast = () => {
  if (!toast) {
    return;
  }

  if (toastAnimating) {
    setTimeout(() => {
      toastAnimating = false;
      hideToast();
    }, toastAnimTiming);
    return;
  }

  toast.classList.add("toast-exit");
};

const saveLocation = (location: string, coords: number[]) => {
  window.localStorage.setItem("location", location);
  window.localStorage.setItem("coords", JSON.stringify(coords));
};

const readLocation = () => {
  const coords = window.localStorage.getItem("coords");
  if (!coords) {
    return;
  }

  const location = window.localStorage.getItem("location");

  return {
    location,
    coords: JSON.parse(coords),
  };
};

let priorLocation = readLocation();

const getLocation = async (lat: number, lon: number) => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`,
    {
      headers: {
        accept: "application/json",
      },
    }
  );
  if (response.ok) {
    const json = await response.json();
    priorLocation = { location: json.name as string, coords: [lat, lon] };
    saveLocation(json.name, [lat, lon]);
    console.log({ json });
  } else {
    console.log("location lookup failed");
  }
};

const gradientColourStops = [
  dangerColours[DangerRating.Low].stroke,
  dangerColours[DangerRating.Moderate].stroke,
  dangerColours[DangerRating.High].stroke,
  dangerColours[DangerRating.VeryHigh].stroke,
  dangerColours[DangerRating.Extreme].stroke,
];
const stopStep = 1 / gradientColourStops.length;

const buildRatingBarGradient = () => {
  const stops = gradientColourStops.map((color, index) => {
    if (!index) {
      return color;
    }

    return `${color} ${Math.round(stopStep * index * 100)}%`;
  });
  return `linear-gradient(90deg, ${stops.join(",")})`;
};

const showLocationDetail = ({
  location,
  dangerRating,
}: {
  location: string | null;
  dangerRating: DangerRating;
}) => {
  const detail = document.getElementById("location-rating");
  if (!detail) {
    console.warn("could not find detail div");
    return;
  }
  detail.classList.add("show");
  setTimeout(() => {
    detail.classList.add("fade-in");
  }, 100);

  const detailHeader = detail.firstElementChild;
  if (location && detailHeader) {
    detailHeader.innerHTML = detailHeader.innerHTML.replace(
      "your location",
      location
    );
  }

  const ratingBar = document.getElementById("rating-bar");
  if (ratingBar && ratingBar.firstElementChild) {
    ratingBar.style.background = buildRatingBarGradient();
    setTimeout(() => {
      const arrowOffset =
        dangerRating === DangerRating.Low
          ? "0%"
          : Math.round((dangerRating * stopStep - stopStep / 2) * 100);
      const arrow = ratingBar.firstElementChild as HTMLDivElement;
      arrow.style.left = `${arrowOffset}%`;
      arrow.style.opacity = "1";
    }, 2000);
  }

  const ratingLabel = document.getElementById("rating-label");
  if (ratingLabel) {
    ratingLabel.innerHTML = dangerLabel[dangerRating];
  }

  const ratingDots = document.getElementsByClassName("rating-dot");
  Array.from(ratingDots).forEach((dot) => {
    const classes = dot.className.split(" ");
    const dotClass = classes.find((cls) => cls.startsWith("dot-"));
    if (dotClass) {
      const [, code] = dotClass.split("-");
      (dot as HTMLDivElement).style.background =
        dangerColours[Number(code) as DangerRating].stroke;
    }
  });
};

const findDistrictAndRatings = (coords: number[]) => {
  const foundDistrict = districtGeoJson.features.find((geoFeature) => {
    if (geoFeature.geometry.type !== "Polygon") {
      console.warn(
        "skipping geojson feature that is not a polygon",
        geoFeature
      );
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
        [gridCode]:
          typeof acc[gridCode] === "number" ? acc[gridCode] + area : area,
      }),
      {} as Record<number, number>
    );
};

const findCoordinateInZones = () => {
  if (priorLocation?.coords) {
    const [lat, lon] = priorLocation.coords;
    const pos = point([lon, lat]);
    const found = fdrGeoJson.features.find((geoFeature) => {
      if (geoFeature.geometry.type !== "Polygon") {
        console.warn(
          "skipping geojson feature that is not a polygon",
          geoFeature
        );
        return;
      }

      const { coordinates, bbox } = geoFeature.geometry;
      const poly = polygon(coordinates, geoFeature.properties, { bbox });

      return booleanWithin(pos, poly);
    });

    if (!found) {
      return;
    }

    const gridCode = (found as any).properties?.GRIDCODE;
    if (!DangerRating[gridCode]) {
      console.warn("invalid GRIDCODE received for polygon match:", gridCode);
      return;
    }

    const foundZones = findDistrictAndRatings(priorLocation.coords);
    console.log({ foundZones });

    showLocationDetail({
      location: priorLocation.location,
      dangerRating: gridCode as DangerRating,
    });
  }
};

const canadaSquareMeters = 9_984_670_000_000;
const areaLookup = {} as Record<DangerRating, number>;

fdrGeoJson.features.forEach((feature) => {
  const sqMeters = area(feature);
  const code = feature.properties.GRIDCODE;
  if (DangerRating[code]) {
    if (typeof areaLookup[code as DangerRating] !== "number") {
      areaLookup[code as DangerRating] = 0;
    }
    areaLookup[code as DangerRating] += sqMeters;
  }
});

const totalCoverage = Object.values(areaLookup).reduce(
  (sum, num) => sum + num,
  0
);
const pctOfCanada = totalCoverage / canadaSquareMeters;
const pctLookup = Object.keys(areaLookup).reduce(
  (acc, code) => ({
    ...acc,
    [code]: areaLookup[Number(code) as DangerRating] / totalCoverage,
  }),
  {}
);

console.log({
  areaLookup,
  totalCoverage,
  canadaSquareMeters,
  pctOfCanada,
  pctLookup,
});

if (navigator.geolocation && !priorLocation) {
  showToast("Requesting your location to show current danger rating");
  navigator.geolocation.getCurrentPosition(
    (position) => {
      hideToast();
      console.log({ position });
      saveLocation("", [position.coords.latitude, position.coords.longitude]);
      getLocation(position.coords.latitude, position.coords.longitude).then(
        () => findCoordinateInZones()
      );
    },
    (positionError) => {
      hideToast();
      console.log({ positionError });
    }
  );
} else {
  findCoordinateInZones();
}
