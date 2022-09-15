import booleanWithin from "@turf/boolean-within";
import { point, polygon, BBox, Position } from "@turf/helpers";

import "./style.css";
import "./map";
import fdrMeta from "../../files/date.json";
import fdrJson from "../../files/fdr.json";
import { dangerColours, dangerLabel, DangerRating } from "./constants";

interface GeoJsonFeature {
  type: "Feature";
  geometry: {
    bbox: BBox;
    type: string;
    coordinates: Position[][];
    properties: Record<string, any>;
  };
}

interface GeoJsonFeatureCollection {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}

const fdrGeoJson = fdrJson as GeoJsonFeatureCollection;

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

      const { coordinates, properties, bbox } = geoFeature.geometry;
      const poly = polygon(coordinates, properties, { bbox });

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

    showLocationDetail({
      location: priorLocation.location,
      dangerRating: gridCode as DangerRating,
    });
  }
};

if (navigator.geolocation && !priorLocation) {
  showToast("Requesting your location to show current danger rating");
  navigator.geolocation.getCurrentPosition(
    (position) => {
      hideToast();
      console.log({ position });
      saveLocation("", [position.coords.latitude, position.coords.longitude]);
      getLocation(position.coords.latitude, position.coords.longitude);
    },
    (positionError) => {
      hideToast();
      console.log({ positionError });
    }
  );
} else {
  findCoordinateInZones();
}
