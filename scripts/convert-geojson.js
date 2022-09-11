const shp = require("shpjs");

const zipBuffer = require("fs").readFileSync("files/fdr.zip");
shp(zipBuffer).then((geojson) => {
  console.log(JSON.stringify(geojson, null, 2));
});

// const shpBuffer = require("fs").readFileSync("files/fdr.shp");
// const dbfBuffer = require("fs").readFileSync("files/fdr.dbf");

// const shpJson = shp.combine([shp.parseShp(shpBuffer), shp.parseDbf(dbfBuffer)]);

// console.log(JSON.stringify(shpJson, null, 2));

// shp("files/fdr.zip").then(function (geojson) {
//   console.log({ geojson });
// });
