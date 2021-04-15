<template>
  <div
    class="layer-toggle"
    @mouseenter="baselayerIconHover = true"
    @mouseleave="baselayerIconHover = false"
  >
    <i style="vertical-align: middle; font-size: 18px; color: black;">
      <font-awesome-icon v-if="!baselayerIconHover" icon="bars" />
    </i>

    <div v-show="baselayerIconHover">
      <div style="margin-bottom: 10px;">
        <h4>Base Layers</h4>
         <div v-for="baseLayer in baseLayers" v-bind:key="baseLayer.id" class="row-form">
           <input
             class="layer-toggle-input"
             type="radio"
             name="selectedLayer"
             :value="baseLayer.id"
             v-model="selectedLayer"
           />
           <label class="layer-toggle-label">{{baseLayer.name}}</label>
         </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: { accessToken: String, fhirServerUrl: String },
  data: () => ({
    baselayerIconHover: false,
    baseLayers: [
      {
        name: "Streets",
        id: "streets-v11",
        url: "mapbox://styles/mapbox/streets-v11"
      },
      {
        name: "Satellite",
        id: "satellite-v9",
        url: "mapbox://styles/mapbox/satellite-v9",
      }
    ],
    selectedLayer: "satellite-v9"
  }),
  mounted() {},
  watch: {
    selectedLayer: function(layerId) {
      const layer = this.baseLayers.find(l => l.id === layerId);

      this.$emit('baselayer', layer);

    }
  },
  methods: {
    addContextLayerModal() {
      // Do nothing
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.layer-toggle {
  background-color: white;
  padding: 5px;
}
</style>