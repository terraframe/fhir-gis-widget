<template>
  <div id="app">
    <FhirMap
      :accessToken="accessToken"
      :fhirServerUrl="fhirServerUrl"
      :contextServices="[{
        id:'cgr-geoserver',
        type:'wms',
        label:'CGR geoserver',
        url:'https://localhost:8443/geoserver/georegistry/wms',
        layers:[{
          label:'Districts',
          name:'georegistry:ml_0district'
        },{
          label:'Provinces',
          name:'georegistry:ml_0province'
        }]
      }]"
    />
  </div>
</template>

<script>
import FhirMap from "./components/FhirMap.vue";

export default {
  name: "App",
  data: () => ({
    accessToken: process.env.VUE_APP_MAPBOX_API_KEY,
    fhirServerUrl: process.env.VUE_APP_FHIR_BASE_URL,
    contextServices: [{}]
  }),

  components: {
    FhirMap
  }
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

.map-view-port {
  width: 100%;
  height: 100vh;
}
</style>
