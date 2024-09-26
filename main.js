import { MapboxOverlay as DeckOverlay } from "@deck.gl/mapbox";
import maplibregl from "maplibre-gl";
import { GeoJsonLayer } from "@deck.gl/layers";
import { load } from "@loaders.gl/core";
import { CSVLoader } from "@loaders.gl/csv";

import "maplibre-gl/dist/maplibre-gl.css";
import "./style.css";

// Polygon data
const ZIP_CODES_DATA =
  "https://raw.githubusercontent.com/ActionEngine/data-samples/refs/heads/main/csv/cdb_zcta5_fdb278bc.csv";

// Create a basemap
const map = new maplibregl.Map({
  container: "map",
  style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  center: [-73.942046, 40.759784],
  zoom: 8,
  bearing: 0,
  pitch: 30,
});

// Polygon data will be loaded asyncronously
let zipCodesData = [];

// Keep selected polygon ids in a Set to have a distinct list of ids.
let selectedZipCodes = new Set();

// Selection frame is to update polygons when selection has changed
let zipCodesSelectionFrame = 0;

// Layer creator. We wrap it in a function to create a new instance when deck.gl re-render
const getZipCodesLayer = () =>
  new GeoJsonLayer({
    id: "zip_codes",
    data: zipCodesData,

    stroked: false,
    filled: true,
    pickable: true,

    getFillColor: (d) =>
      selectedZipCodes.has(d.id) ? [0, 0, 255, 255] : [160, 160, 180, 200],
    autoHighlight: true,
    updateTriggers: {
      // Register the trigger that will cause the color update when `zipCodesSelectionFrame` is changing
      getFillColor: zipCodesSelectionFrame,
    },
  });

// Create deck.gl engine
const deckOverlay = new DeckOverlay({
  layers: [],
  // We handle click event globally
  onClick: (e) => {
    if (e.layer.id === "zip_codes") {
      if (selectedZipCodes.has(e.object.id)) {
        // Unselect polygon
        selectedZipCodes.delete(e.object.id);
      } else {
        // Select polygon
        selectedZipCodes.add(e.object.id);
      }

      // Incremet selection frame to cause the color update
      zipCodesSelectionFrame++;
      // Update the layer
      deckOverlay.setProps({
        layers: [getZipCodesLayer()],
      });
    }
  },
});

// Connect the basemap and deck.gl
map.addControl(deckOverlay);

// Use @loaders.gl API to load an parse CSV file
load(ZIP_CODES_DATA, CSVLoader).then((result) => {
  // Transform csv tabular data to GeoJSON features
  zipCodesData = result.data.map((row) => ({
    type: "Feature",
    id: row.geoid,
    geometry: JSON.parse(row.f0_),
    properties: {
      code: row.geoid,
    },
  }));
  // Update the layer
  deckOverlay.setProps({
    layers: [getZipCodesLayer()],
  });
});

