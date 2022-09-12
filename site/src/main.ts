import "./style.css";
import "./map";
import fdrMeta from "../../files/date.json";

const { date } = fdrMeta;
const currentYear = new Date().getFullYear();
const infoDiv = document.getElementById("map-info") ?? { innerHTML: "" };

infoDiv.innerHTML = `\
Last updated ${date} • \
Canadian Forest Service. ${currentYear}. \
<a href="http://cwfis.cfs.nrcan.gc.ca">Canadian Wildland Fire Information System (CWFIS)</a>, Natural Resources Canada, Canadian Forest Service, Northern Forestry Centre, Edmonton, Alberta.\
`;

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
    // const xmlText = await response.text();
    // const xmlData = new window.DOMParser().parseFromString(xmlText, "text/xml");
    // console.log({ xmlData });
    const json = await response.json();
    console.log({ json });
  } else {
    console.log("location lookup failed");
  }
};

if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      console.log({ position });
      getLocation(position.coords.latitude, position.coords.longitude);
    },
    (positionError) => {
      console.log({ positionError });
    }
  );
}
