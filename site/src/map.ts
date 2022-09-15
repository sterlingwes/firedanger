import { Map, View } from "ol";
import { fromLonLat } from "ol/proj";
import { boundingExtent } from "ol/extent";
import GeoJSON from "ol/format/GeoJSON";
import { Style, Fill, Stroke } from "ol/style";
import { defaults, DragPan, MouseWheelZoom } from "ol/interaction";
import { platformModifierKeyOnly } from "ol/events/condition";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import { OSM, Vector as VectorSource } from "ol/source";

import geojsonObject from "../../files/fdr.json";
import { dangerColours, DangerRating } from "./constants";

const lineWidth = 2;

const lowColour = dangerColours[DangerRating.Low];
const moderateColour = dangerColours[DangerRating.Moderate];
const highColour = dangerColours[DangerRating.High];
const veryHighColour = dangerColours[DangerRating.VeryHigh];
const extremeColour = dangerColours[DangerRating.Extreme];

const gridCodeStyles = Object.freeze({
  // LOW
  0: new Style({
    stroke: new Stroke({
      color: lowColour.stroke,
      width: lineWidth,
    }),
    fill: new Fill({
      color: lowColour.fill,
    }),
  }),
  // MODERATE
  1: new Style({
    stroke: new Stroke({
      color: moderateColour.stroke,
      width: lineWidth,
    }),
    fill: new Fill({
      color: moderateColour.fill,
    }),
  }),
  // HIGH
  2: new Style({
    stroke: new Stroke({
      color: highColour.stroke,
      width: lineWidth,
    }),
    fill: new Fill({
      color: highColour.fill,
    }),
  }),
  // VERY HIGH
  3: new Style({
    stroke: new Stroke({
      color: veryHighColour.stroke,
      width: lineWidth,
    }),
    fill: new Fill({
      color: veryHighColour.fill,
    }),
  }),
  // EXTREME
  4: new Style({
    stroke: new Stroke({
      color: extremeColour.stroke,
      width: lineWidth,
    }),
    fill: new Fill({
      color: extremeColour.fill,
    }),
  }),
});

const styles = Object.freeze({
  Polygon: gridCodeStyles,
});

const supportedFeatures = Object.keys(styles);
const supportedGridCodes = Object.keys(gridCodeStyles);

const styleFunction = function (feature: any) {
  const gridCode = feature.values_.GRIDCODE;
  const featureType = feature.getGeometry().getType();

  if (
    supportedFeatures.includes(featureType) === false ||
    supportedGridCodes.includes(gridCode.toString()) === false
  ) {
    return;
  }

  return styles[featureType as keyof typeof styles][
    gridCode as keyof typeof gridCodeStyles
  ];
};

const webMercatorProjection = "EPSG:3857";

const vectorSource = new VectorSource({
  features: new GeoJSON().readFeatures(geojsonObject, {
    featureProjection: webMercatorProjection,
  }),
});

const vectorLayer = new VectorLayer({
  source: vectorSource,
  style: styleFunction,
});

const canadaCenterCoordinate = fromLonLat([-97.82193, 58.45155]);

const canadaExtent = {
  topLeft: fromLonLat([-143.34927, 70.39505]),
  bottomRight: fromLonLat([-50.88834, 41.80951]),
};

const extent = boundingExtent([canadaExtent.topLeft, canadaExtent.bottomRight]);

const map = new Map({
  target: "map",
  interactions: defaults({ dragPan: false, mouseWheelZoom: false }).extend([
    new DragPan({
      condition: function (event) {
        return (
          event.originalEvent.pointerType === "mouse" ||
          (this as any).getPointerCount() === 2
        );
      },
    }),
    new MouseWheelZoom({
      condition: platformModifierKeyOnly,
    }),
  ]),
  layers: [
    new TileLayer({
      source: new OSM(),
    }),
    vectorLayer,
  ],
  view: new View({
    center: canadaCenterCoordinate,
  }),
});

// map.on("moveend", () => {
//   const zoom = map.getView().getZoom();
//   console.log({ zoom });
// });

const constrainView = () => {
  map.getView().fit(extent, { size: map.getSize() });
  const initialZoom = map.getView().getZoom();
  if (typeof initialZoom === "number") {
    const minZoom = Math.floor(initialZoom);
    map.getView().setMinZoom(minZoom);
  }
};

window.onresize = () => {
  constrainView();
};

constrainView();
