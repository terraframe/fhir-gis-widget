<template>
  <div id="map-container">
    <b-form id="search-form" @submit.prevent="onSearch" inline>
      <b-form-select id="searchType" v-model="form.searchType" required>
        <b-form-select-option value="IDENTIFIER">Identifier</b-form-select-option>
        <b-form-select-option value="NAME">Name</b-form-select-option>
      </b-form-select>
      <b-form-input
        v-if="form.searchType === 'IDENTIFIER'"
        id="system"
        v-model="form.system"
        placeholder="System (opt)"
      ></b-form-input>
      <b-form-input id="text" v-model="form.text" :placeholder="form.searchType === 'IDENTIFIER' ? 'Identifier...' : 'Name...'"></b-form-input>
      <b-button type="submit" variant="primary" :disabled="isLoading">Search</b-button>
    </b-form>
    <div id="map" class="map-view-port"></div>
  </div>
</template>

<script>
import mapboxgl from "mapbox-gl";
import bbox from "@turf/bbox";

export default {
  data: () => ({
    isLoading: false,
    form: {
      searchType: "NAME",
      system: null,
      text: null,
      checked: []
    }
  }),
  mounted() {
    mapboxgl.accessToken = process.env.VUE_APP_MAPBOX_API_KEY;

    this.map = new mapboxgl.Map({
      container: "map",
      style: "mapbox://styles/mapbox/light-v9",
      center: [-96, 37.8],
      zoom: 3
    });

    this.map.on("load", () => {
      this.initMap();
    });
  },
  methods: {
    async onSearch() {
      try {
        this.isLoading = true;

        // Build the search URL
        let url = process.env.VUE_APP_FHIR_BASE_URL + "/Location";

        // Include the search parameters if there are any
        if (this.form.text) {
          if (this.form.searchType === "NAME") {
            url += "?name=" + encodeURIComponent(this.form.text);
          } else {
            const identifier = this.form.system
              ? this.form.system + "|" + this.form.text
              : this.form.text;

            url += "?identifier=" + encodeURIComponent(identifier);
          }
        }

        const response = await this.$http.get(url);

        // Create the feature collection from the FHIR response
        const collection = this.createFeatureCollection(response.data);

        // Update the map results
        this.map.getSource("locations").setData(collection);

        // Zoom to the results on the map
        if (collection.features.length > 0) {
          var bounds = bbox(collection);
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
      this.addLayer();

      // Add zoom and rotation controls to the map.
      this.map.addControl(
        new mapboxgl.NavigationControl({ visualizePitch: true })
      );
      this.map.addControl(
        new mapboxgl.AttributionControl({ compact: true }),
        "bottom-right"
      );
    },
    addLayer() {
      const DEFAULT_COLOR = "#80cdc1";
      // const SELECTED_COLOR = "#800000";

      const source = "locations";

      this.map.addSource(source, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: []
        }
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
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
@import "~mapbox-gl/dist/mapbox-gl.css";

#map-container{
  position: relative;
}

#search-form {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 10;
}
</style>