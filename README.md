# fhir-gis-widget

A GIS widget for viewing Location resources from a FHIR server.  Locations must include geojson data as an extension to be viewable on the map.  The Location.position value will be used as a fallback if not geojson data is provided.

# Installation

    npm install @terraframe/fhir-gis-widget

# Usage
```
<template>
  <v-app>
    <FhirMap
      :accessToken="accessToken"
      :fhirServerUrl="fhirServerUrl"
      :options="options"
    />
  </v-app>
</template>

<script>
import FhirMap from "@terraframe/fhir-gis-widget";
import options from "./config/options.json";

export default {
  name: "App",
  data: () => ({
    accessToken: process.env.VUE_APP_MAPBOX_API_KEY,
    fhirServerUrl: process.env.VUE_APP_FHIR_BASE_URL,
    options: options,
  }),

  components: {
    FhirMap,
  },
};
</script>

<style>
@import "~@terraframe/fhir-gis-widget/dist/fhir-gis-widget.css";

html {
  overflow: hidden;
}

.map-view-port {
  width: 100%;
  height: calc(100vh - 24px);
}
</style>
```
fhir-gis-widget is dependent upon both Vuetify and Axios being global dependencies.  In your main.js you must include the declaration of both:

```
import Vue from 'vue'

import App from './App.vue'
import vuetify from './plugins/vuetify'
import axios from 'axios'
import VueAxios from 'vue-axios'

Vue.use(VueAxios, axios)

new Vue({
  vuetify,
  render: h => h(App)
}).$mount('#app')
```

# Configuration Options

## Sample options configuration

```
{
	"center": [
		8.521441,
		-11.84389		
	],
	"zoom": 3,
	"root": 1352,
	"includeRoot": true,
	"contextServices": [],
	"searchParameters": [
		{
			"key": "physicalType",
			"system": false,
			"label": "Physical Type",
			"placeholder": "Physical Type..",
			"options": []
		}
	],
	"filters": []
}
```

## Config Parameters
- center: Default point to use when loading the map
- zoom: Default zoom level to use when loading the map
- root: Id of the FHIR Location resource to use as the root node of the Hierarchies tree.  If a root value is not specified then the Hierarchies panel will be hidden
- includeRoot: Flag indicating if the Hierarchies panel should include the root node, or just children of the root node.
- contextServices: List of services which provide extra context layers for the map.  Currently supports geoserver WMS context layers as well as CGR vector tile layers.  See further below for more details about configuring context layer services.
- searchParameters: List of custom search parameters not provided by the widget which can be used to restrict the map results. See further below for more details about configuring search parameters.
- filters: List of global filters to use when restricting all Location results.  Expecting an object with 'name' and 'value' properties.  Such as the following: {'name':'idenitifier', 'value' : 'XXX-YYY-ZZZ'}

## Context Service Definitions

### GeoServer WMS Context Layer

```
{
  "id":"cgr-geoserver",
	"type":"wms",
	"vendor":"geoserver",
	"label":"CGR geoserver",
	"url":"https://localhost:8443/geoserver/georegistry/wms",
	"layers":[
	  {
		  "label":"Districts",
			"name":"georegistry:district",
			"level":2
		}
	]
},
```
- id: Unique id of the service
- type: Layer type.  Must be 'wms' or 'vector'
- label: Service label to display to the user
- url: URL of the GeoServer endpoint.
- layers: List of GeoServer WMS layers to provide as context layers.
  - label: Label of the layer
  - name: Name of the layer in geoserver
  - level: Used to determine the stacking order of layers on the map.  The higher the number the lower the layer will appear on the map.

### CGR Vector tile layer
```
{
	"type":"vector",
	"label":"CGR vector",
	"locale":"en",
	"layers":[
		{
			"label":"Cambodia 2021-03-31",
			"name":"d1",
			"url":"https://localhost:8443/georegistry/master-list/tile?x={x}&y={y}&z={z}&config=%7B%22oid%22%3A%22c150e6e2-2bea-4b70-ac76-33eb600005f1%22%7D",
			"level":0
		}
	]
}
```
- type: Layer type.  Must be 'wms' or 'vector'
- label: Service label to display to the user
- locale: Locale of the data to use from CGR.
- layers: List of CGR vectors layers to provide as context layers.
  - label: Label of the layer
  - name: Unique name of the layer
  - url: URL of the CGR vector tile endpoint.  Must include x={x}&y={y}&z={z} such that Mapbox-GL can provide the correct tile requests.
  - level: Used to determine the stacking order of layers on the map.  The higher the number the lower the layer will appear on the map.


## Search parameter definitions

### Custom search parameter without additional system restriction
```
{
  key: "name",
  system: false,
  label: "Name",
  placeholder: "Name..",
  options: [],
},
```

### Custom search parameter with additional system restriction
```
{
  key: "type",
  system: true,
  label: "Type",
  placeholder: "Type..",
  options: ["=", ":text", ":not", ":not-in", ":above", ":below", ":in"],
},
```

### Custom select list search parameter
```
{
  key: "status",
  system: false,
  label: "Status",
  select: ["active", "suspended", "inactive"],
  options: [],
},
```        