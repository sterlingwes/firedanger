import { Map, View } from "ol";
import { fromLonLat } from "ol/proj";
import { boundingExtent } from "ol/extent";
import GeoJSON from "ol/format/GeoJSON";
import { Style, Fill, Stroke } from "ol/style";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import { OSM, Vector as VectorSource } from "ol/source";

import geojsonObject from "../../files/fdr.json";

const lineWidth = 2;

const gridCodeStyles = Object.freeze({
  // LOW
  0: new Style({
    stroke: new Stroke({
      color: "#0000ff",
      width: lineWidth,
    }),
    fill: new Fill({
      color: "#0000ff80",
    }),
  }),
  // MODERATE
  1: new Style({
    stroke: new Stroke({
      color: "#00E300",
      width: lineWidth,
    }),
    fill: new Fill({
      color: "#00E30080",
    }),
  }),
  // HIGH
  2: new Style({
    stroke: new Stroke({
      color: "#ffff00",
      width: lineWidth,
    }),
    fill: new Fill({
      color: "#ffff0080",
    }),
  }),
  // VERY HIGH
  3: new Style({
    stroke: new Stroke({
      color: "#cc9900",
      width: lineWidth,
    }),
    fill: new Fill({
      color: "#cc990080",
    }),
  }),
  // EXTREME
  4: new Style({
    stroke: new Stroke({
      color: "#ff0000",
      width: lineWidth,
    }),
    fill: new Fill({
      color: "#ff000080",
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

const constrainView = () => map.getView().fit(extent, { size: map.getSize() });

window.onresize = () => {
  constrainView();
};

constrainView();