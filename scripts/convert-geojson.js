const shp = require("shpjs");

const filepath = process.argv.slice(0).pop();
if (filepath.endsWith("zip") === false) {
  console.log("! Expected a ZIP file path");
  process.exit(1);
}

const zipBuffer = require("fs").readFileSync(filepath);

shp(zipBuffer).then((geojson) => {
  console.log(JSON.stringify(geojson));
});
