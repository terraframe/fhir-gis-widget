<template>
  <div
    class="layer-toggle"
    @mouseenter="baselayerIconHover = true"
    @mouseleave="baselayerIconHover = false"
  >
    <i v-if="!baselayerIconHover" class="layer-button">
      <FontAwesomeIcon icon="bars" />
    </i>

    <v-card id="base-layer-panel" v-show="baselayerIconHover">
      <div style="margin-bottom: 10px;">
        
        <v-radio-group column v-model="selectedLayer">
          <h4>Base layer</h4>

          <v-radio
            v-for="baseLayer in baseLayers"
            v-bind:key="baseLayer.id"
            name="selectedLayer"
            :value="baseLayer.id"
            :label="baseLayer.name"
          ></v-radio>
        </v-radio-group>
      </div>
      <div v-if="contextServices && contextServices.length > 0">
        <div>
          <h4>Context layers</h4>
        </div>
        <v-list v-for="service in contextServices" v-bind:key="service.label">
            <label>{{ service.label }} ({{service.type}})</label>
              
              <v-list-item v-for="layer in service.layers" v-bind:key="layer.name">
                  <v-checkbox
                    v-model="layer.active"
                    :name="layer.name"
                    :label="layer.label"
                    v-on:change="onContextChange"
                  ></v-checkbox>
              </v-list-item>
            </v-list>
      </div>
    </v-card>
  </div>
</template>

<script>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

export default {
  components: {
    FontAwesomeIcon,
  },
  props: { contextServices: Array },
  data: () => ({
    baselayerIconHover: false,
    baseLayers: [
      {
        name: "Streets",
        id: "streets-v11",
        url: "mapbox://styles/mapbox/streets-v11",
        type: "mapbox"
      },
      {
        name: "Satellite",
        id: "satellite-v9",
        url: "mapbox://styles/mapbox/satellite-v9",
        type: "mapbox"
      },
      {
        name: "Hybrid",
        id: "satellite-streets-v11",
        url: "mapbox://styles/mapbox/satellite-streets-v11",
        type: "mapbox"
      },
      {
        name: "Streets OSM",
        id: "street-osm",
        url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        type: "osm"
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
  .layer-button {
    padding: 2px 6px;
    vertical-align: middle;
    font-size: 16px;
    color: black;
    float: right;
    width: 26px;
    height: 26px;
    border-radius: 5px;
  }

  #base-layer-panel {
    padding: 0 10px;
    top: -16px;
  }
</style>