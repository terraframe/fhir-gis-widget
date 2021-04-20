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
      <div v-if="contextServices && contextServices.length > 0">
        <div>
          <h4>Context layers</h4>
        </div>
        <b-list-group v-for="service in contextServices" v-bind:key="service.label">
          <b-list-group-item>
            <label>{{ service.label }} ({{service.type}})</label>
            <b-list-group>
              <b-list-group v-for="layer in service.layers" v-bind:key="layer.name">
                <b-list-group>
                  <b-form-checkbox
                    v-model="layer.active"
                    :name="layer.name"
                    v-on:change="onContextChange"
                  >{{ layer.label }}</b-form-checkbox>
                </b-list-group>
              </b-list-group>
            </b-list-group>
          </b-list-group-item>
        </b-list-group>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: { contextServices: Array },
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
        url: "mapbox://styles/mapbox/satellite-v9"
      },
      {
        name: "Hybrid",
        id: "satellite-streets-v11",
        url: "mapbox://styles/mapbox/satellite-streets-v11"
      }
    ],
    selectedLayer: "satellite-v9"
  }),
  mounted() {},
  watch: {
    selectedLayer: function(layerId) {
      const layer = this.baseLayers.find(l => l.id === layerId);

      this.$emit("baselayer", layer);
    }
  },
  methods: {
    onContextChange: function() {
      this.$emit("contextchange", this.contextServices);
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