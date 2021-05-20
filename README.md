# fhir-gis-widget

A GIS widget for viewing Location resources from a FHIR server.  Locations must include geojson data as an extension to be viewable on the map.

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
@import "~mapbox-gl/dist/mapbox-gl.css";
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
# Sample options configuration

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
