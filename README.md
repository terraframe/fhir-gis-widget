# fhir-gis-widget

A GIS widget for viewing Location resources from a FHIR server.  Locations must include geojson data as an extension to be viewable on the map.  The Location.position value will be used as a fallback if not geojson data is provided.

# Prerequisites
- A Vue app that the widget will be installed into.
- A FHIR server with data loaded that the widget will use.

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
fhir-gis-widget is dependent upon both Vuetify being defined as a global dependencies.  In your main.js you must include the declaration of both:

```
import Vue from 'vue'

import App from './App.vue'
import vuetify from './plugins/vuetify'

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
	"searchOnLoad" : true	
	"zoom": 3,
	"isFacility" : true,
	"hierarchyExtension": {
		"url": "http://gofr.org/fhir/StructureDefinition/GOFR.IHE.mCSD.OrganizationHierarchy",
		"parameter": "ihe-mcsd-hierarchy-partof"
	},
	"orgRoot": 1,
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
	"filters": [],
	"attributes": [
		{
			"name": "identifier",
			"label": "Identifiers",
			"expression": "Location.identifier.value"
		},
		{
			"name": "description",
			"label": "Description",
			"expression": "Location.description.single()"
		},
		{
			"name": "status",
			"label": "Status",
			"expression": "Location.status.single()"
		}
	],
	"locationStyles": {
		"fill": {
			"fill-color": "#B22222",
			"fill-opacity": 0.8,
			"fill-outline-color": "black"
		}
	},
	"selectedStyles": {
		"circle": {
			"circle-radius": 10,
			"circle-color": "#d3d3d3",
			"circle-stroke-width": 2,
			"circle-stroke-color": "#FFFFFF"
		},
	}

}
```

## Config Parameters
- center: Default point to use when loading the map
- zoom: Default zoom level to use when loading the map
- searchOnLoad : Automatically loads the first set of locations in FHIR and zooms to them when the map loads.
- isFacility: Flag denoting if the FHIR data represent MCSD Facility Locations. If this is set to true the widget expects the MCSD Hierarchy Extension has a SearchParameter definition called hierarchyExtension defined on the Organization resource.  The expected FHIR expression on the search parameter is: Organization.extension('http://ihe.net/fhir/StructureDefinition/IHE.mCSD.hierarchy.extension').extension('part-of').  The widget will also search for the presence of the metadata profile 'http://ihe.net/fhir/StructureDefinition/IHE.mCSD.FacilityLocation' to automatically determine this value.  If isFacility is set to false it will take precedent over the derived value from the metadata.
- hierarchyExension
  - url: The url of the extension the widget should use to get the hierarchy information.  If not specified this value defaults to: 'http://ihe.net/fhir/StructureDefinition/IHE.mCSD.hierarchy.extension'
  - parameter: The name of the search parameter defined on the FHIR server to use when querying for the hierarchy 'part-of' information.  If not specified this value defaults to: 'hierarchyExtension' 
- root: Id of the FHIR Location resource to use as the root node of the Hierarchies tree.  If a root value is not specified then the Hierarchies panel will be hidden
- orgRoot: Id of the FHIR Organization resrouce to use as the root node of the Organization tree.  If the widget is using MCSD facilities this would be the root Facility Organization.  If this property is not provided the widget will make a :missing criteria query to the server for all Organizations which do not have a parent specified and assume they should be used as root nodes.
- includeRoot: Flag indicating if the Hierarchies panel should include the root node, or just children of the root node.
- contextServices: List of services which provide extra context layers for the map.  Currently supports geoserver WMS context layers as well as CGR vector tile layers.  See further below for more details about configuring context layer services.
- searchParameters: List of custom search parameters not provided by the widget which can be used to restrict the map results. See further below for more details about configuring search parameters.
- filters: List of global filters to use when restricting all Location results.  Expecting an object with 'name' and 'value' properties.  Such as the following: {'name':'idenitifier', 'value' : 'XXX-YYY-ZZZ'}
- attributes: List of attributes/value pairs which should appear in the pop-up modal.   Uses Fhirpath (http://hl7.org/fhirpath/) to get the values out of the resource JSON object.  When being used in the MCSD facility mode the Organization and Location resources can be queried for values.
- locationStyles : Mapbox-gl paint definition (https://docs.mapbox.com/mapbox-gl-js/style-spec/layers/) to use for the Location layer on the map.
- selectedStyles : Mapbox-gl paint definition (https://docs.mapbox.com/mapbox-gl-js/style-spec/layers/) to use for the selected location layer on the map.

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
