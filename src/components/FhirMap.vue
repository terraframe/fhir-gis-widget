<template>
  <v-app id="fhir-gis-app">
    <v-container fluid>
      <v-row>
        <v-col class="d-flex" style="height: 100vh" cols="12" sm="3">
          <v-tabs
            v-model="tab"
            background-color="#005695"
            class="elevation-2"
            dark
          >
            <v-tabs-slider></v-tabs-slider>

            <v-tab key="Search" href="#tab-search"> Search </v-tab>

            <template
              v-if="
                options.isFacility || (options.isFacility == null && isFacility)
              "
            >
              <v-tab key="Facilities" href="#tab-facility"> Locations </v-tab>
            </template>
            <template v-else>
              <v-tab v-if="options.root != null" key="Tree" href="#tab-tree">
                Hierarchies
              </v-tab>
              <v-tab key="Orgs" href="#tab-org"> Organizations </v-tab>
            </template>

            <v-tab-item key="Search" value="tab-search">
              <v-form @submit.prevent="onSearch">
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
                  v-model="form.system"
                  placeholder="(opt)"
                  label="System"
                ></v-text-field>

                <v-text-field
                  filled
                  outlined
                  v-if="!form.selected.select"
                  id="text"
                  v-model="form.text"
                  :label="form.selected.label"
                  :placeholder="form.selected.placeholder"
                ></v-text-field>
                <v-select
                  filled
                  outlined
                  v-if="form.selected.select"
                  id="text"
                  v-model="form.text"
                  :items="form.selected.select"
                  item-text="sType"
                  item-value="sType"
                ></v-select>
                <v-text-field
                  filled
                  outlined
                  label="limit"
                  type="number"
                  id="count"
                  v-model="form.count"
                ></v-text-field>
                <v-btn
                  id="search-button"
                  style="margin-bottom: 10px"
                  type="submit"
                  variant="primary"
                  v-show="!isLoading"
                  :disabled="isLoading"
                >
                  Search
                </v-btn>
                <v-progress-circular
                  v-if="isLoading"
                  indeterminate
                  color="primary"
                ></v-progress-circular>
              </v-form>
            </v-tab-item>
            <template
              v-if="
                options.isFacility ||
                (this.options.isFacility == null && this.isFacility)
              "
            >
              <v-tab-item key="Facilities" value="tab-facility">
                <FacilityPanel
                  :fhirServerUrl="fhirServerUrl"
                  :options="options"
                  v-on:select="onNodeSelected"
                ></FacilityPanel>
              </v-tab-item>
            </template>
            <template v-else>
              <v-tab-item
                v-if="options.root != null"
                key="Tree"
                value="tab-tree"
              >
                <LocationPanel
                  :fhirServerUrl="fhirServerUrl"
                  :options="options"
                  v-on:select="onNodeSelected"
                ></LocationPanel>
              </v-tab-item>
              <v-tab-item key="Orgs" value="tab-org">
                <OrganizationPanel
                  :fhirServerUrl="fhirServerUrl"
                  :options="options"
                  v-on:select="onNodeSelected"
                ></OrganizationPanel>
              </v-tab-item>
            </template>
          </v-tabs>
        </v-col>
        <v-col class="d-flex" cols="12" sm="9">
          <div id="map-container">
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
  </v-app>
</template>

<script>
import mapboxgl from "mapbox-gl";
import axios from "axios";
import VueAxios from "vue-axios";
import Vue from "vue";
import bbox from "@turf/bbox";
import { library } from "@fortawesome/fontawesome-svg-core";
import {
  faSearch,
  faBars,
  faMapPin,
  faAngleDoubleLeft,
} from "@fortawesome/free-solid-svg-icons";
import fhirpath from "fhirpath";

import LayerPanel from "./LayerPanel";
import OrganizationPanel from "./OrganizationPanel";
import LocationPanel from "./LocationPanel";
import FacilityPanel from "./FacilityPanel";

library.add(faSearch, faBars, faMapPin, faAngleDoubleLeft);

Vue.use(VueAxios, axios);

export default {
  name: "fhir-gis-widget",
  components: {
    LayerPanel,
    OrganizationPanel,
    LocationPanel,
    FacilityPanel,
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
          hierarchyExtension: {
            url: "http://ihe.net/fhir/StructureDefinition/IHE.mCSD.hierarchy.extension",
            parameter: "hierarchyExtension",
          },
        };
      },
    },
  },
  data() {
    return {
      tab: "tab-search",
      selected: null,
      isLoading: false,
      isFacility: false,
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
      parents: {
        type: "FeatureCollection",
        features: [],
      },
      locations: [],
      mode: "ORG",
      orgs: [],
      sequence: 0,
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

    this.map.dragRotate.disable();
    this.map.touchZoomRotate.disableRotation();

    this.map.on("load", () => {
      this.initMap();
    });

    // Determine if this is using MCSD facilities
    this.hasFacilityMetadata();
  },
  methods: {
    async hasFacilityMetadata() {
      // Build the search URL
      let url = this.fhirServerUrl + "/metadata";

      // Get the parent
      const response = await this.$http.get(url);

      if (response.status === 200) {
        const resource = response.data;

        const result = fhirpath.evaluate(
          resource,
          "CapabilityStatement.rest.resource.where(profile = 'http://ihe.net/fhir/StructureDefinition/IHE.mCSD.FacilityLocation').exists()"
        );

        this.isFacility = result[0];
      }
    },
    onNodeSelected(node) {
      if (node.data != null && node.data.url == null) {
        this.selected = node.data.id;

        this.onSearch();
      }
    },
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
    onSearch() {
      if (
        this.options.isFacility ||
        (this.options.isFacility == null && this.isFacility)
      ) {
        this.onFacilitySearch();
      } else {
        this.onLocationSearch();
      }
    },
    async onLocationSearch() {
      try {
        this.isLoading = true;

        this.parents = {
          type: "FeatureCollection",
          features: [],
        };

        // Build the search URL
        let url = this.fhirServerUrl + "/Location";

        var params = new URLSearchParams();

        if (this.tab !== "tab-search") {
          if (this.selected != null) {
            params.append("partof", this.selected);
          }

          // Recurive include for location
          params.append("_revinclude", "Location:partof");
        } else {
          params.append("_count", this.form.count);

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

            params.append(attr, value);
          }
        }

        if (this.options.filters) {
          this.options.filters.forEach((filter) => {
            params.append(filter.name, filter.value);
          });
        }

        const response = await this.$http.get(url, {
          params: params,
        });

        // Create the feature collection from the FHIR response
        this.collection = this.createFeatureCollection(response.data);

        // Update the map results
        this.map.getSource("locations").setData(this.collection);

        // Update the parents layer
        if (this.tab !== "tab-search") {
          if (this.selected != null) {
            this.parents = {
              type: "FeatureCollection",
              features: [],
            };

            // Get the parent
            const response = await this.$http.get(url, {
              params: {
                _id: this.selected,
              },
            });

            // Create the feature collection from the FHIR response
            this.parents = this.createFeatureCollection(response.data);
          }
        }

        this.map.getSource("parents").setData(this.parents);

        // Get bounds of all features
        let union = {
          type: "FeatureCollection",
          features: [],
        };

        union.features = union.features.concat(this.collection.features);
        union.features = union.features.concat(this.parents.features);

        // Zoom to the results on the map
        if (union.features.length > 0) {
          let bounds = bbox(union);

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
        new mapboxgl.NavigationControl({
          visualizePitch: false,
          showCompass: false,
        }),
        "top-right"
      );
      this.map.addControl(
        new mapboxgl.AttributionControl({ compact: true }),
        "bottom-right"
      );

      this.map.on("click", (e) => {
        let features = this.map.queryRenderedFeatures(e.point);

        if (features.length > 0) {
          const feature = features[0];

          let html = "<div>";
          html += "<h2> " + feature.properties.name + "</h2>";
          html += "<hr/>";
          html += "<ul>";

          if (
            this.options.attributes != null &&
            this.options.attributes.length > 0
          ) {
            this.options.attributes.forEach((attribute) => {
              const value = feature.properties[attribute.name];

              html += "<li> " + attribute.label + " : ";

              if (value != null) {
                let json = value;

                try {
                  json = JSON.parse(value);
                } catch (e) {
                  // Do nothing
                }

                if (Array.isArray(json)) {
                  html += "<ul>";
                  json.forEach((v) => {
                    html += "<li>" + v + "</li>";
                  });
                  html += "</ul>";
                } else {
                  html += value;
                }
              }
              html += "</li>";
            });
          }
          html += "</ul>";

          if (feature.properties["_services"] != null) {
            let services = null;

            try {
              services = JSON.parse(feature.properties["_services"]);
            } catch (e) {
              // Do nothing
            }

            if (services != null && services.length > 0) {
              html += "<hr/>";
              html += "<h4>Services</h4>";

              html += "<ul>";
              services.forEach((v) => {
                html += "<li>" + v + "</li>";
              });
              html += "</ul>";
            }
          }

          html += "</div>";

          new mapboxgl.Popup({ closeOnClick: true, closeButton: false })
            .setLngLat(e.lngLat)
            .setHTML(html)
            .addTo(this.map);
        }
      });

      if (this.options.searchOnLoad) {
        this.onSearch();
      }
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
    addLocationLayers() {
      this.addGeojsonLayers(
        "locations",
        "locationStyles",
        "#80cdc1",
        this.collection
      );
    },
    addParentLayers() {
      this.addGeojsonLayers(
        "parents",
        "selectedStyles",
        "#d3d3d3",
        this.parents
      );
    },
    addGeojsonLayers(source, styleName, color, data) {
      this.map.addSource(source, {
        type: "geojson",
        data: data,
      });

      const fill =
        this.options[styleName] != null && this.options[styleName].fill != null
          ? this.options[styleName].fill
          : {
              "fill-color": color,
              "fill-opacity": 0.8,
              "fill-outline-color": "black",
            };

      const line =
        this.options[styleName] != null && this.options[styleName].line != null
          ? this.options[styleName].line
          : {
              "line-color": color,
              "line-opacity": 0.8,
              "line-width": 1,
            };

      const circle =
        this.options[styleName] != null &&
        this.options[styleName].circle != null
          ? this.options[styleName].circle
          : {
              "circle-radius": 10,
              "circle-color": color,
              "circle-stroke-width": 2,
              "circle-stroke-color": "#FFFFFF",
            };

      const label =
        this.options[styleName] != null && this.options[styleName].label != null
          ? this.options[styleName].label
          : {
              "text-color": "black",
              "text-halo-color": "#fff",
              "text-halo-width": 2,
            };

      // Polygon layer
      this.map.addLayer({
        id: source + "-polygon",
        type: "fill",
        source: source,
        layout: {},
        paint: fill,
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
        paint: line,
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
        paint: circle,
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
        paint: label,
        layout: {
          "text-field": ["get", "name"],
          "text-offset": [0, 0.6],
          "text-anchor": "top",
          "text-size": 12,
        },
      });
    },

    addLayers() {
      this.addParentLayers();

      this.addLocationLayers();

      this.refreshContextLayers();
    },
    createFeatureCollection(payload) {
      let features = [];

      if (payload.entry) {
        payload.entry.forEach((entry) => {
          const resource = entry.resource;

          // Create the feature
          const feature = {
            type: "Feature",
            properties: {
              name: resource.name || "",
            },
          };

          if (
            this.options.attributes != null &&
            this.options.attributes.length > 0
          ) {
            this.options.attributes.forEach((attribute) => {
              const value = fhirpath.evaluate(resource, attribute.expression);

              feature.properties[attribute.name] = value;
            });
          }

          // Use geojson if exists
          feature.geometry = this.parseGeoJson(resource);

          if (feature.geometry != null) {
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

      const fill =
        layer.styles != null && layer.styles.fill != null
          ? layer.styles.fill
          : {
              "fill-color": SELECTED_COLOR,
              "fill-opacity": 0.8,
              "fill-outline-color": "black",
            };

      const line =
        layer.styles != null && layer.styles.line != null
          ? layer.styles.line
          : {
              "line-color": SELECTED_COLOR,
              "line-opacity": 0.8,
              "line-width": 1,
            };

      const circle =
        layer.styles != null && layer.styles.circle != null
          ? layer.styles.circle
          : {
              "circle-radius": 10,
              "circle-color": SELECTED_COLOR,
              "circle-stroke-width": 2,
              "circle-stroke-color": "#FFFFFF",
            };

      const label =
        layer.styles != null && layer.styles.label != null
          ? layer.styles.label
          : {
              "text-color": "black",
              "text-halo-color": "#fff",
              "text-halo-width": 2,
            };

      // Point layer
      this.map.addLayer(
        {
          id: source + "-points",
          type: "circle",
          source: source,
          "source-layer": "context",
          paint: circle,
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
        paint: line,
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
          paint: fill,
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
          paint: label,
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
    async onFacilitySearch() {
      try {
        this.isLoading = true;
        this.sequence++;

        this.parents = {
          type: "FeatureCollection",
          features: [],
        };

        // Build the search URL
        let url = this.fhirServerUrl + "/Location";

        var params = new URLSearchParams();

        // Include the Organization
        params.append("_include", "Location:organization");

        // Include the services
        params.append("_revinclude", "HealthcareService:location");

        if (this.tab !== "tab-search") {
          // params.append("_count", 300);

          if (this.selected != null) {
            params.append(
              "organization." + this.options.hierarchyExtension.parameter,
              this.selected
            );
          }

          // Recurive include for location
          // TODO change this to chain off of the organization hierarchy extensions value
          // params.append("_revinclude", "Location:partof");
        } else {
          params.append("_count", this.form.count);

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

            params.append(attr, value);
          }
        }

        if (this.options.filters) {
          this.options.filters.forEach((filter) => {
            params.append(filter.name, filter.value);
          });
        }

        const response = await this.$http.get(url, {
          params: params,
        });

        // Create the feature collection from the FHIR response
        this.collection = this.createFacilityCollection(response.data);

        if (this.tab !== "tab-search") {
          this.handleFacilityLink(response, this.sequence);
        }

        // Update the map results
        this.map.getSource("locations").setData(this.collection);

        // Update the parents layer
        if (this.tab !== "tab-search") {
          if (this.selected != null) {
            this.parents = {
              type: "FeatureCollection",
              features: [],
            };

            // Get the parent
            const response = await this.$http.get(url, {
              params: {
                organization: this.selected,
                _include: "Location:organization",
                _revinclude: "HealthcareService:location",
              },
            });

            // Create the feature collection from the FHIR response
            this.parents = this.createFacilityCollection(response.data);
          }
        }

        this.map.getSource("parents").setData(this.parents);

        // Get bounds of all features
        let union = {
          type: "FeatureCollection",
          features: [],
        };

        union.features = union.features.concat(this.collection.features);
        union.features = union.features.concat(this.parents.features);

        // Zoom to the results on the map
        if (union.features.length > 0) {
          let bounds = bbox(union);

          this.map.fitBounds(bounds, { padding: 20 });
        }
      } catch (err) {
        // uh oh, didn't work, time for plan B
        console.log(err);
      } finally {
        this.isLoading = false;
      }
    },
    async handleFacilityLink(response, sequence) {
      let links = fhirpath.evaluate(
        response.data,
        "Bundle.link.where(relation = 'next').url"
      );

      while (links.length > 0 && sequence === this.sequence) {
        const response = await this.$http.get(links[0], {});

        if (sequence === this.sequence) {
          const page = this.createFacilityCollection(response.data);

          this.collection.features = this.collection.features.concat(
            page.features
          );

          // Update the map results
          this.map.getSource("locations").setData(this.collection);
        }

        links = fhirpath.evaluate(
          response.data,
          "Bundle.link.where(relation = 'next').url"
        );
      }
    },
    createFacilityCollection(payload) {
      let features = [];

      const locations = fhirpath.evaluate(
        payload,
        "Bundle.entry.resource.ofType(Location)"
      );

      locations.forEach((resource) => {
        if (resource.managingOrganization != null) {
          const orgExpression =
            "Bundle.entry.resource.ofType(Organization).where(id = '" +
            resource.managingOrganization.reference.replace(
              "Organization/",
              ""
            ) +
            "')";

          const organization = fhirpath.evaluate(payload, orgExpression)[0];

          // Create the feature
          const feature = {
            type: "Feature",
            properties: {
              name: organization.name || "",
            },
          };

          if (
            this.options.attributes != null &&
            this.options.attributes.length > 0
          ) {
            this.options.attributes.forEach((attribute) => {
              const value = fhirpath.evaluate(resource, attribute.expression);

              if (organization != null) {
                value.concat(
                  fhirpath.evaluate(organization, attribute.expression)
                );
              }

              feature.properties[attribute.name] = value;
            });
          }

          // Add the list of services to the feature properties
          const expression =
            "Bundle.entry.resource.ofType(HealthcareService).where(location.reference contains '" +
            resource.resourceType +
            "/" +
            resource.id +
            "').name";

          feature.properties["_services"] = fhirpath.evaluate(
            payload,
            expression
          );

          // Get the geojson if it exists
          feature.geometry = this.parseGeoJson(resource);

          if (feature.geometry != null) {
            features.push(feature);
          }
        }
      });

      return { type: "FeatureCollection", features: features };
    },
    parseGeoJson(resource) {
      // Get the geojson if it exists
      const result = fhirpath.evaluate(
        resource,
        "Location.extension.where(url = 'http://hl7.org/fhir/StructureDefinition/location-boundary-geojson').valueAttachment.data"
      );

      if (result.length > 0) {
        try {
          const data = result[0];

          if (data) {
            return JSON.parse(window.atob(data));
          }
        } catch (e) {
          // Swallow the error
        }
      }

      // Else fall back on the position data if it exists, otherwise do
      // not map the location
      if (
        resource.position != null &&
        resource.position.longitude != null &&
        resource.position.latitude != null
      ) {
        return {
          type: "Point",
          coordinates: [
            resource.position.longitude,
            resource.position.latitude,
          ],
        };
      }

      return null;
    },
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
@import "~mapbox-gl/dist/mapbox-gl.css";

#fhir-gis-app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}

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

>>> .v-window.v-item-group.v-tabs-items {
  overflow: auto;
  height: calc(100% - 48px);
  padding: 10px;
}
</style>