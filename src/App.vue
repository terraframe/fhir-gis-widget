<template>
  <v-app id="app">
    <FhirMap
      :accessToken="accessToken"
      :fhirServerUrl="fhirServerUrl"
      :options="options"
    />
  </v-app>
</template>

<script>
import FhirMap from "./components/FhirMap.vue";
import options from "./config/options.json";

export default {
  name: "App",
  data: () => ({
    accessToken: process.env.VUE_APP_MAPBOX_API_KEY,
    fhirServerUrl: process.env.VUE_APP_FHIR_BASE_URL,
    options: options
  }),

  components: {
    FhirMap,
  },
};
</script>

<style>
html {
  overflow: hidden;
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}

.map-view-port {
  width: 100%;
  height: calc(100vh - 24px);
}
</style>
