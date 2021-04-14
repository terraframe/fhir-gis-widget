<template>
  <div id="app">
    <FhirMap/>
  </div>
</template>

<script>
import FhirMap from './components/FhirMap.vue'

export default {
  name: 'App',
  components: {
    FhirMap
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
