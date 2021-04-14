<template>
  <div id="map-container">
    <div id="map" class="map-view-port"></div>
    <div v-if="isLoading">Loading data from server</div>
    <div v-else>
      <button v-on:click="onSearch()">View FHIR locations</button>
    </div>
  </div>
</template>

<script>
import mapboxgl from "mapbox-gl";

export default {
  data: () => ({
    isLoading: false
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

        const url = process.env.VUE_APP_FHIR_BASE_URL + "Location";

        const response = await this.$http.get(url);

        const collection = this.createFeatureCollection(response.data);

        this.map.getSource("children").setData(collection);
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

      const source = "children";

      this.map.addSource(source, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: []
        }
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
        for (let i = 0; i < payload.entry.length; i++) {
          const entry = payload.entry[i];
          const resource = entry.resource;

          // const feature = {
          //   type: "Feature",
          //   geometry: {
          //     type: "Point",
          //     coordinates: [
          //       resource.position.longitude,
          //       resource.position.latitude
          //     ]
          //   },
          //   properties: {
          //     name: resource.name
          //   }
          // };
          //
          // features.push(feature);

          resource.extension.forEach(extension => {
            if (
              extension.url ===
              "http://hl7.org/fhir/StructureDefinition/location-boundary-geojson"
            ) {
              const data = extension.valueAttachment.data;

              if (data) {

                const geometry = JSON.parse(window.atob(data));

                const feature = {
                  type: "Feature",
                  geometry: geometry,
                  properties: {
                    name: resource.name
                  }
                };

                features.push(feature);
              }
            }
          });
        }
      }

      console.log(features);

      return { type: "FeatureCollection", features: features };
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
@import "~mapbox-gl/dist/mapbox-gl.css";

.map-view-port {
  width: 100%;
  height: 500px;
}
</style>