<template>
  <div id="map-container">
    <b-form id="search-form" @submit.prevent="onSearch" inline>
      <b-form-select id="searchType" v-model="form.searchType" required>
        <b-form-select-option
          v-for="sType of searchTypes "
          v-bind:key="sType.key"
          :value="sType.key"
        >{{sType.label}}</b-form-select-option>
      </b-form-select>
      <b-form-input
        v-if="form.selected.type === 'system'"
        id="system"
        v-model="form.system"
        placeholder="System (opt)"
      ></b-form-input>
      <b-form-input id="text" v-model="form.text" :placeholder="form.selected.placeholder"></b-form-input>
      <b-form-input type="number" id="count" v-model="form.count" placeholder="Result Limit"></b-form-input>
      <b-button type="submit" variant="primary" :disabled="isLoading">
        <font-awesome-icon icon="search" />
      </b-button>
    </b-form>
    <LayerPanel
      v-on:baselayer="onChangeBaseLayer"
      v-on:contextchange="refreshContextLayers"
      :contextServices="contextServices"
    ></LayerPanel>
    <div id="map" class="map-view-port"></div>
  </div>
</template>

<script>
import mapboxgl from "mapbox-gl";
import bbox from "@turf/bbox";

import LayerPanel from "./LayerPanel";

export default {
  components: {
    LayerPanel
  },
  props: {
    accessToken: { type: String, required: true },
    fhirServerUrl: { type: String, required: true },
    contextServices: { type: Array, default: () => [] },
    center: { type: Array, default: () => [-96, 37.8] },
    zoom: { type: Number, default: 2 }
  },
  data: () => ({
    isLoading: false,
    form: {
      selected: {
        key: "name",
        type: "single",
        label: "Name",
        placeholder: "Name.."
      },
      searchType: "name",
      system: null,
      text: null,
      count: 20,
      checked: []
    },
    searchTypes: [
      {
        key: "identifier",
        type: "system",
        label: "Identifier",
        placeholder: "Identifier.."
      },
      {
        key: "type",
        type: "system",
        label: "Type",
        placeholder: "Type.."
      },
      { key: "name", type: "single", label: "Name", placeholder: "Name.." }
    ],
    collection: {
      type: "FeatureCollection",
      features: []
    }
  }),
  watch: {
    "form.searchType": function(searchType) {
      this.form.selected = this.searchTypes.find(
        sType => sType.key === searchType
      );
    }
  },

  mounted() {
    mapboxgl.accessToken = this.accessToken;

    this.map = new mapboxgl.Map({
      container: "map",
      style: "mapbox://styles/mapbox/satellite-v9",
      center: this.center,
      zoom: this.zoom
    });

    this.map.on("load", () => {
      this.initMap();
    });
  },
  methods: {
    refreshContextLayers() {
      // Remove all context layers
      this.contextServices.forEach(service => {
        if (service.type === "wms") {
          this.removeWMSLayer(service);
        } else if (service.type === "vector") {
          service.layers.forEach(vectorLayer => {
            this.removeVectorLayer(service, vectorLayer);
          });
        } else {
          console.log(
            "Unsupported service type [" +
              service.type +
              "].  Supported types are: wms"
          );
        }
      });

      // Create the enabled layer constructs
      const layers = [];

      this.contextServices.forEach(service => {
        service.layers.forEach(layer => {
          if (layer.active) {
            layers.push({
              service: service,
              layer: layer,
              level: layer.level ? layer.level : 0
            });
          }
        });
      });

      // Sort the layers by level
      layers.sort((l1, l2) => l1.level > l2.level);

      // Add the enabled layers
      layers.forEach(l => {
        const service = l.service;

        if (service.type === "wms") {
          this.addWMSLayer(service, [l.layer]);
        } else if (service.type === "vector") {
          this.addVectorLayer(service, l.layer);
        } else {
          console.log(
            "Unsupported service type [" +
              service.type +
              "].  Supported types are: wms"
          );
        }
      });
    },
    async onSearch() {
      try {
        this.isLoading = true;

        // Build the search URL
        let url = this.fhirServerUrl + "/Location";

        // Include the page limit if it has been defined
        url += "?_count=" + this.form.count;

        // Include the search parameters if there are any
        if (this.form.text) {
          let value = this.form.text;

          if (this.form.selected.type === "system" && this.form.system) {
            value = this.form.system + "|" + this.form.text;
          }

          url += "&" + this.form.selected.key + "=" + encodeURIComponent(value);
        }

        const response = await this.$http.get(url);

        // Create the feature collection from the FHIR response
        this.collection = this.createFeatureCollection(response.data);

        // Update the map results
        this.map.getSource("locations").setData(this.collection);

        // Zoom to the results on the map
        if (this.collection.features.length > 0) {
          var bounds = bbox(this.collection);
          this.map.fitBounds(bounds, { padding: 20 });
        }
      } catch (err) {
        // uh oh, didn't work, time for plan B
        console.log(err);
      } finally {
        this.isLoading = false;
      }
    },
    initMap() {
      this.map.on("style.load", () => {
        this.addLayers();
      });

      this.addLayers();

      // Add zoom and rotation controls to the map.
      this.map.addControl(
        new mapboxgl.NavigationControl({ visualizePitch: true }),
        "bottom-left"
      );
      this.map.addControl(
        new mapboxgl.AttributionControl({ compact: true }),
        "bottom-right"
      );
    },
    onChangeBaseLayer(layer) {
      this.map.setStyle(layer.url);
    },
    addLayers() {
      const DEFAULT_COLOR = "#80cdc1";

      const source = "locations";

      this.map.addSource(source, {
        type: "geojson",
        data: this.collection
      });

      // Polygon layer
      this.map.addLayer({
        id: source + "-polygon",
        type: "fill",
        source: source,
        layout: {},
        paint: {
          "fill-color": DEFAULT_COLOR,
          "fill-opacity": 0.8,
          "fill-outline-color": "black"
        },
        filter: [
          "all",
          ["match", ["geometry-type"], ["Polygon", "MultiPolygon"], true, false]
        ]
      });

      // Line layer
      this.map.addLayer({
        id: source + "-line",
        type: "line",
        source: source,
        layout: {},
        paint: {
          "line-color": DEFAULT_COLOR,
          "line-opacity": 0.8,
          "line-width": 1
        },
        filter: [
          "all",
          [
            "match",
            ["geometry-type"],
            ["LineString", "MultiLineString"],
            true,
            false
          ]
        ]
      });

      // Point layer
      this.map.addLayer({
        id: source + "-points",
        type: "circle",
        source: source,
        paint: {
          "circle-radius": 10,
          "circle-color": DEFAULT_COLOR,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#FFFFFF"
        },
        filter: [
          "all",
          ["match", ["geometry-type"], ["Point", "MultiPont"], true, false]
        ]
      });

      // Label layer
      this.map.addLayer({
        id: source + "-label",
        source: source,
        type: "symbol",
        paint: {
          "text-color": "black",
          "text-halo-color": "#fff",
          "text-halo-width": 2
        },
        layout: {
          "text-field": ["get", "name"],
          "text-offset": [0, 0.6],
          "text-anchor": "top",
          "text-size": 12
        }
      });

      this.refreshContextLayers();
    },
    createFeatureCollection(payload) {
      let features = [];

      if (payload.entry) {
        payload.entry.forEach(entry => {
          let hasGeojsonExtension = false;

          const resource = entry.resource;

          // Use geojson if exists
          resource.extension.forEach(extension => {
            if (
              extension.url ===
              "http://hl7.org/fhir/StructureDefinition/location-boundary-geojson"
            ) {
              try {
                const data = extension.valueAttachment.data;

                if (data) {
                  const geometry = JSON.parse(window.atob(data));

                  const feature = {
                    type: "Feature",
                    geometry: geometry,
                    properties: {
                      name: resource.name || ""
                    }
                  };

                  features.push(feature);

                  hasGeojsonExtension = true;
                }
              } catch (e) {
                hasGeojsonExtension = false;
              }
            }
          });

          // Else fall back on the position data if it exists, otherwise do not map the location
          if (
            !hasGeojsonExtension &&
            resource.position != null &&
            resource.position.longitude != null &&
            resource.position.latitude != null
          ) {
            const feature = {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [
                  resource.position.longitude,
                  resource.position.latitude
                ]
              },
              properties: {
                name: resource.name || ""
              }
            };

            features.push(feature);
          }
        });
      }

      return { type: "FeatureCollection", features: features };
    },
    addWMSLayer(service, layers) {
      let url = service.url;
      url +=
        "?bbox={bbox-epsg-3857}&format=image/png&service=WMS&version=1.1.1&request=GetMap&srs=EPSG:3857&transparent=true&width=256&height=256";

      url +=
        "&LAYERS=" +
        layers
          .map(function(layer) {
            return encodeURIComponent(layer.name);
          })
          .join(",");

      this.map.addSource(service.id + "-source", {
        type: "raster",
        tiles: [url],
        tileSize: 256
      });
      this.map.addLayer(
        {
          id: service.id + "-layer",
          type: "raster",
          source: service.id + "-source",
          paint: {}
        },
        "locations-polygon"
      );
    },
    removeWMSLayer(service) {
      if (this.map.getSource(service.id + "-source") != null) {
        this.map.removeLayer(service.id + "-layer");
        this.map.removeSource(service.id + "-source");
      }
    },
    addVectorLayer(service, layer) {
      const SELECTED_COLOR = "#800000";

      const source = layer.id + "-source";

      this.map.addSource(source, {
        type: "vector",
        tiles: [layer.url]
      });

      // Point layer
      this.map.addLayer(
        {
          id: source + "-points",
          type: "circle",
          source: source,
          "source-layer": "context",
          paint: {
            "circle-radius": 10,
            "circle-color": SELECTED_COLOR,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#FFFFFF"
          },
          filter: [
            "all",
            ["match", ["geometry-type"], ["Point", "MultiPont"], true, false]
          ]
        },
        "locations-polygon"
      );

      // Line layer
      this.map.addLayer({
        id: source + "-line",
        type: "line",
        source: source,
        "source-layer": "context",
        paint: {
          "line-color": SELECTED_COLOR,
          "line-opacity": 0.8,
          "line-width": 1
        },
        filter: [
          "all",
          [
            "match",
            ["geometry-type"],
            ["LineString", "MultiLineString"],
            true,
            false
          ]
        ]
      });

      // Polygon layer
      this.map.addLayer(
        {
          id: source + "-polygon",
          type: "fill",
          source: source,
          "source-layer": "context",
          layout: {},
          paint: {
            "fill-color": SELECTED_COLOR,
            "fill-opacity": 0.8,
            "fill-outline-color": "black"
          },
          filter: [
            "all",
            [
              "match",
              ["geometry-type"],
              ["Polygon", "MultiPolygon"],
              true,
              false
            ]
          ]
        },
        "locations-polygon"
      );

      // Label layer
      this.map.addLayer(
        {
          id: source + "-label",
          source: source,
          "source-layer": "context",
          type: "symbol",
          paint: {
            "text-color": "black",
            "text-halo-color": "#fff",
            "text-halo-width": 2
          },
          layout: {
            "text-field": [
              "case",
              ["has", "displayLabel_" + service.locale],
              [
                "coalesce",
                ["string", ["get", "displayLabel_" + service.locale]],
                ["string", ["get", "displayLabel"]]
              ],
              ["string", ["get", "displayLabel"]]
            ],
            "text-offset": [0, 0.6],
            "text-anchor": "top",
            "text-size": 12
          }
        },
        "locations-polygon"
      );
    },
    removeVectorLayer(service, layer) {
      const source = layer.id + "-source";

      if (this.map.getSource(source) != null) {
        this.map.removeLayer(source + "-points");
        this.map.removeLayer(source + "-line");
        this.map.removeLayer(source + "-polygon");
        this.map.removeLayer(source + "-label");
        this.map.removeSource(source);
      }
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
@import "~mapbox-gl/dist/mapbox-gl.css";

#map-container {
  position: relative;
}

#search-form {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 10;
}

.layer-toggle {
  position: absolute;
  right: 10px;
  top: 10px;
  z-index: 10;
}
</style>