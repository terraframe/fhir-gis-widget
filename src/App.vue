<template>
  <v-app id="app">
    <FhirMap
      :accessToken="accessToken"
      :fhirServerUrl="fhirServerUrl"
      :center="center"
      :zoom="zoom"
      :contextServices="contextServices"
      root="1351"
    />
  </v-app>
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
  color: #2c3e50;
}

.map-view-port {
  width: 100vh;
  height: 100vh;
}
</style>
