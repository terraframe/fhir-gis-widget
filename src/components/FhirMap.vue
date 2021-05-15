<template>
  <v-container fluid>
    <v-row>
      <v-col v-if="options.root != null" class="d-flex" cols="12" sm="3">
        <tree :options="treeOptions" ref="tree" />
      </v-col>
      <v-col class="d-flex" cols="12" :sm="options.root != null ? 9 : 12">
        <div id="map-container">
          <v-container id="search-form" fluid>
            <v-form @submit.prevent="onSearch" inline>
              <v-row>
                <v-col class="d-flex" cols="3" sm="3">
                  <v-select
                    filled
                    outlined
                    id="searchType"
                    class="select-input"
                    v-model="form.searchType"
                    :items="searchTypes"
                    item-text="label"
                    item-value="key"
                    required
                  ></v-select>
                </v-col>

                <v-col class="d-flex" cols="5" sm="5">
                  <v-select
                    v-if="form.selected.options.length > 0"
                    filled
                    outlined
                    v-model="form.option"
                    :items="form.selected.options"
                    item-text="label"
                    item-value="key"
                  ></v-select>

                  <v-text-field
                    filled
                    outlined
                    v-if="form.selected.system"
                    id="system"
                    style="margin-left: 5px"
                    v-model="form.system"
                    placeholder="(opt)"
                    label="System"
                  ></v-text-field>

                  <v-text-field
                    filled
                    outlined
                    v-if="!form.selected.select"
                    id="text"
                    style="margin-left: 5px"
                    v-model="form.text"
                    :label="form.selected.label"
                    :placeholder="form.selected.placeholder"
                  ></v-text-field>
                  <v-select
                    filled
                    outlined
                    v-if="form.selected.select"
                    id="text"
                    style="margin-left: 5px"
                    v-model="form.text"
                    :items="form.selected.select"
                    item-text="sType"
                    item-value="sType"
                  ></v-select>
                </v-col>

                <v-col class="d-flex" cols="1" sm="1">
                  <v-text-field
                    filled
                    outlined
                    label="limit"
                    type="number"
                    id="count"
                    v-model="form.count"
                  ></v-text-field>
                </v-col>

                <v-col class="d-flex" cols="1" sm="1">
                  <v-btn
                    id="search-button"
                    type="submit"
                    variant="primary"
                    v-show="!isLoading"
                    :disabled="isLoading"
                  >
                    <font-awesome-icon icon="search" />
                  </v-btn>
                  <v-progress-circular
                    v-if="isLoading"
                    indeterminate
                    color="primary"
                  ></v-progress-circular>
                </v-col>
              </v-row>
            </v-form>
          </v-container>
          <LayerPanel
            v-on:baselayer="onChangeBaseLayer"
            v-on:contextchange="refreshContextLayers"
            :contextServices="options.contextServices"
          ></LayerPanel>
          <div id="map" class="map-view-port"></div>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import mapboxgl from "mapbox-gl";
import bbox from "@turf/bbox";

import LayerPanel from "./LayerPanel";

export default {
  components: {
    LayerPanel,
  },
  props: {
    accessToken: { type: String, required: true },
    fhirServerUrl: { type: String, required: true },
    options: {
      type: Object,
      default: () => {
        return {
          contextServices: [],
          center: [-96, 37.8],
          zoom: 2,
          includeRoot: true,
          searchParameters: [],
          filters: [],
        };
      },
    },
  },
  data() {
    return {
      treeOptions: {
        fetchData: (node) => {
          return this.getNodes(node);
        },
      },
      selected: null,
      isLoading: false,
      form: {
        selected: {
          key: "name",
          system: false,
          label: "Name",
          placeholder: "Name..",
          options: [],
        },
        searchType: "name",
        system: null,
        text: null,
        option: "=",
        count: 20,
        checked: [],
      },
      searchTypes: [
        {
          key: "identifier",
          system: true,
          label: "Identifier",
          placeholder: "Identifier..",
          options: ["=", ":text", ":not", ":not-in", ":above", ":below", ":in"],
        },
        {
          key: "type",
          system: true,
          label: "Type",
          placeholder: "Type..",
          options: ["=", ":text", ":not", ":not-in", ":above", ":below", ":in"],
        },
        {
          key: "status",
          system: false,
          label: "Status",
          select: ["active", "suspended", "inactive"],
          options: [],
        },
        {
          key: "name",
          system: false,
          label: "Name",
          placeholder: "Name..",
          options: [],
        },
      ],
      collection: {
        type: "FeatureCollection",
        features: [],
      },
    };
  },
  watch: {
    "form.searchType": function (searchType) {
      this.form.selected = this.searchTypes.find(
        (sType) => sType.key === searchType
      );

      this.form.option = "=";
    },
  },

  mounted() {
    mapboxgl.accessToken = this.accessToken;

    if (this.options.searchParameters != null) {
      this.searchTypes = this.searchTypes.concat(this.options.searchParameters);
    }

    if (this.options.root != null) {
      this.selected = this.options.root;
    }

    this.map = new mapboxgl.Map({
      container: "map",
      style: "mapbox://styles/mapbox/satellite-v9",
      center: this.options.center,
      zoom: this.options.zoom,
    });

    this.map.on("load", () => {
      this.initMap();
    });

    if (this.$refs.tree != null) {
      this.$refs.tree.$on("node:selected", (e) => {
        this.selected = e.data.id;

        this.onSearch();
      });
    }
  },
  methods: {
    setOption(option) {
      this.form.option = option;
    },
    refreshContextLayers() {
      // Remove all context layers
      this.options.contextServices.forEach((service) => {
        if (service.type === "wms") {
          this.removeWMSLayer(service);
        } else if (service.type === "vector") {
          service.layers.forEach((vectorLayer) => {
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

      this.options.contextServices.forEach((service) => {
        service.layers.forEach((layer) => {
          if (layer.active) {
            layers.push({
              service: service,
              layer: layer,
              level: layer.level ? layer.level : 0,
            });
          }
        });
      });

      // Sort the layers by level
      layers.sort((l1, l2) => l1.level > l2.level);

      // Add the enabled layers
      layers.forEach((l) => {
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
    getNodes(node) {
      // Build the search URL
      let url = this.fhirServerUrl + "/Location";

      const params = {};

      if (node.id === "root") {
        if (this.options.root != null) {
          if (this.options.includeRoot) {
            params["_id"] = this.options.root;
          } else {
            params.partof = "Location/" + this.options.root;
          }
        }
      } else {
        params.partof = node.data.id;
      }

      return this.$http
        .get(url, {
          params: params,
        })
        .then((resp) => {
          const nodes = [];

          if (resp.data.entry != null) {
            resp.data.entry.forEach((entry) => {
              if (entry.resource) {
                const resource = entry.resource;

                const node = {
                  text: resource.name,
                  data: { id: resource.resourceType + "/" + resource.id },
                  isBatch: true,
                };

                nodes.push(node);
              }
            });
          }

          return nodes;
        });
    },
    async onSearch() {
      try {
        this.isLoading = true;

        // Build the search URL
        let url = this.fhirServerUrl + "/Location";

        const params = {
          _count: this.form.count,
        };

        if (this.selected != null) {
          params.partof = this.selected;
        }

        // Recurive include for location
        params["_revinclude"] = "Location:partof";

        // Include the search parameters if there are any
        if (this.form.text) {
          let value = this.form.text;

          if (this.form.selected.system && this.form.system) {
            value = this.form.system + "|" + this.form.text;
          }

          let attr = this.form.selected.key;

          if (this.form.option !== "=") {
            attr += this.form.option;
          }

          params[attr] = value;
        }

        this.filters.forEach((filter) => {
          params[filter.name] = filter.value;
        });

        const response = await this.$http.get(url, {
          params: params,
        });

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
        "top-right"
      );
      this.map.addControl(
        new mapboxgl.AttributionControl({ compact: true }),
        "bottom-right"
      );
    },
    onChangeBaseLayer(layer) {
      if (layer.type === "mapbox") {
        this.map.setStyle(layer.url);
      } else if (layer.type === "osm") {
        this.map.setStyle({
          version: 8,
          glyphs: "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
          sources: {
            osm: {
              type: "raster",
              tiles: [layer.url],
              tileSize: 256,
              attribution:
                'Map tiles by <a target="_top" rel="noopener" href="https://tile.openstreetmap.org/">OpenStreetMap tile servers</a>, under the <a target="_top" rel="noopener" href="https://operations.osmfoundation.org/policies/tiles/">tile usage policy</a>. Data by <a target="_top" rel="noopener" href="http://openstreetmap.org">OpenStreetMap</a>',
            },
          },
          layers: [
            {
              id: "osm",
              type: "raster",
              source: "osm",
            },
          ],
        });
      }
    },
    addLayers() {
      const DEFAULT_COLOR = "#80cdc1";

      const source = "locations";

      this.map.addSource(source, {
        type: "geojson",
        data: this.collection,
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
          "fill-outline-color": "black",
        },
        filter: [
          "all",
          [
            "match",
            ["geometry-type"],
            ["Polygon", "MultiPolygon"],
            true,
            false,
          ],
        ],
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
          "line-width": 1,
        },
        filter: [
          "all",
          [
            "match",
            ["geometry-type"],
            ["LineString", "MultiLineString"],
            true,
            false,
          ],
        ],
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
          "circle-stroke-color": "#FFFFFF",
        },
        filter: [
          "all",
          ["match", ["geometry-type"], ["Point", "MultiPont"], true, false],
        ],
      });

      // Label layer
      this.map.addLayer({
        id: source + "-label",
        source: source,
        type: "symbol",
        paint: {
          "text-color": "black",
          "text-halo-color": "#fff",
          "text-halo-width": 2,
        },
        layout: {
          "text-field": ["get", "name"],
          "text-offset": [0, 0.6],
          "text-anchor": "top",
          "text-size": 12,
        },
      });

      this.refreshContextLayers();
    },
    createFeatureCollection(payload) {
      let features = [];

      if (payload.entry) {
        payload.entry.forEach((entry) => {
          let hasGeojsonExtension = false;

          const resource = entry.resource;

          // Use geojson if exists
          if (resource.extension != null) {
            resource.extension.forEach((extension) => {
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
                        name: resource.name || "",
                      },
                    };

                    features.push(feature);

                    hasGeojsonExtension = true;
                  }
                } catch (e) {
                  hasGeojsonExtension = false;
                }
              }
            });
          }

          // Else fall back on the position data if it exists, otherwise do
          // not map the location
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
                  resource.position.latitude,
                ],
              },
              properties: {
                name: resource.name || "",
              },
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
          .map(function (layer) {
            return encodeURIComponent(layer.name);
          })
          .join(",");

      this.map.addSource(service.id + "-source", {
        type: "raster",
        tiles: [url],
        tileSize: 256,
      });
      this.map.addLayer(
        {
          id: service.id + "-layer",
          type: "raster",
          source: service.id + "-source",
          paint: {},
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
        tiles: [layer.url],
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
            "circle-stroke-color": "#FFFFFF",
          },
          filter: [
            "all",
            ["match", ["geometry-type"], ["Point", "MultiPont"], true, false],
          ],
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
          "line-width": 1,
        },
        filter: [
          "all",
          [
            "match",
            ["geometry-type"],
            ["LineString", "MultiLineString"],
            true,
            false,
          ],
        ],
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
            "fill-outline-color": "black",
          },
          filter: [
            "all",
            [
              "match",
              ["geometry-type"],
              ["Polygon", "MultiPolygon"],
              true,
              false,
            ],
          ],
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
            "text-halo-width": 2,
          },
          layout: {
            "text-field": [
              "case",
              ["has", "displayLabel_" + service.locale],
              [
                "coalesce",
                ["string", ["get", "displayLabel_" + service.locale]],
                ["string", ["get", "displayLabel"]],
              ],
              ["string", ["get", "displayLabel"]],
            ],
            "text-offset": [0, 0.6],
            "text-anchor": "top",
            "text-size": 12,
          },
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
    },
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
@import "~mapbox-gl/dist/mapbox-gl.css";

#map-container {
  position: relative;
  width: 100%;
}

#search-form {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 10;
}

#search-button {
  height: 56px;
}

.v-input {
}

/deep/ .theme--light.v-text-field--filled > .v-input__control > .v-input__slot {
  background: rgb(255, 255, 255) !important;
}

.search-prepend {
  margin-left: 5px;
}

.layer-button {
  width: 29px;
  height: 29px;
}

.layer-toggle {
  position: absolute;
  right: 0px;
  top: 90px;
  z-index: 10;
  margin: 10px 9px 0 0;
  border: solid 2.5px rgba(211, 211, 211, 0.7);
  border-radius: 5px;
  background: #fff;
}
</style>