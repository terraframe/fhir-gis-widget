<template>
  <div id="app">
    <FhirMap
      :accessToken="accessToken"
      :fhirServerUrl="fhirServerUrl"
      :center="center"
      :zoom="zoom"
      :contextServices="contextServices"
    />
  </div>
</template>

<script>
import FhirMap from "./components/FhirMap.vue";
import contextServices from "./config/contex.json"

export default {
  name: "App",
  data: () => ({
    accessToken: process.env.VUE_APP_MAPBOX_API_KEY,
    fhirServerUrl: process.env.VUE_APP_FHIR_BASE_URL,
    center: [
      parseFloat(process.env.VUE_APP_CENTER_X),
      parseFloat(process.env.VUE_APP_CENTER_Y)
    ],
    zoom: parseInt(process.env.VUE_APP_ZOOM),
    contextServices: contextServices
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
