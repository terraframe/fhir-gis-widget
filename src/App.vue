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
      },{
        type:'vector',
        label:'CGR vector',
        locale:'en',
        layers:[{
          name:'d1',
          label:'Districts 2021-03-31',
          url:'https://localhost:8443/georegistry/master-list/tile?x={x}&y={y}&z={z}&config=%7B%22oid%22%3A%22c150e6e2-2bea-4b70-ac76-33eb600005f1%22%7D',
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
