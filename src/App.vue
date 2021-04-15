<template>
  <div id="app">
    <FhirMap :accessToken="accessToken" :fhirServerUrl="fhirServerUrl" />
  </div>
</template>

<script>
import FhirMap from "./components/FhirMap.vue";

export default {
  name: "App",
  data: () => ({
    accessToken: process.env.VUE_APP_MAPBOX_API_KEY,
    fhirServerUrl: process.env.VUE_APP_FHIR_BASE_URL
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
