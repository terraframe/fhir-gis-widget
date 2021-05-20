<template>
  <div>
    <tree v-show="mode === 'TREE'" :options="treeOptions" ref="orgTree">
      <span class="tree-text" slot-scope="{ node }">
        <template>
          {{ node.text }}
          <font-awesome-icon
            v-if="node.data == null || node.data.url == null"
            icon="map-pin"
            v-on:click.prevent="handleClick(node)"
          />
        </template>
      </span>
    </tree>
    <v-list v-if="mode === 'LIST'" dense>
      <v-list-item
        v-on:click="
          mode = 'TREE';
          items = [];
        "
      >
        <font-awesome-icon icon="angle-double-left" />
      </v-list-item>
      <v-subheader> Managed Locations </v-subheader>
      <v-list-item-group color="primary">
        <v-list-item v-for="(item, i) in items" :key="i">
          <v-list-item-content v-on:click="onNodeSelected(item)">
            <v-list-item-title v-text="item.text"></v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list-item-group>
    </v-list>
  </div>
</template>

<script>
export default {
  components: {},
  props: {
    fhirServerUrl: { type: String, required: true },
  },
  data() {
    return {
      treeOptions: {
        fetchData: (node) => {
          return this.getNodes(node);
        },
      },
      items: [],
      mode: "TREE",
    };
  },
  mounted() {},
  methods: {
    onNodeSelected(node) {
      this.$emit("select", node);
    },
    getNodes(node) {
      if (node.data != null && node.data.url != null) {
        // Handle the pagination node
        return this.$http.get(node.data.url, {}).then((resp) => {
          if (resp.data.entry != null) {
            resp.data.entry.forEach((entry) => {
              if (entry.resource) {
                const resource = entry.resource;

                const treeNode = {
                  text: resource.name,
                  data: { id: resource.resourceType + "/" + resource.id },
                  isBatch: true,
                };

                if (node.data.node.id === "root") {
                  this.$refs.orgTree.append(treeNode);
                } else {
                  node.data.node.append(treeNode);
                }
              }
            });

            if (resp.data.link != null) {
              const next = resp.data.link.find(
                (element) => element.relation === "next"
              );

              if (next != null) {
                const treeNode = {
                  text: "...",
                  data: { url: next.url, node: node.data.node },
                  isBatch: true,
                };

                if (node.data.node.id === "root") {
                  this.$refs.orgTree.append(treeNode);
                } else {
                  node.data.node.append(treeNode);
                }
              }
            }
          }

          node.remove();

          return [];
        });
      } else {
        // Expand a normal node

        // First build the search URL
        let url = this.fhirServerUrl + "/Organization";

        const params = {};

        if (node.id === "root") {
          // if (this.options.root != null) {
          //   params["_id"] = this.options.orgRoot;
          // }
          // params.partof = null;
        } else {
          params.partof = node.data.id;
        }

        return this.$http
          .get(url, {
            params: params,
          })
          .then((resp) => {
            const nodes = [];

            if (resp.data.entry != null) {
              resp.data.entry.forEach((entry) => {
                if (entry.resource) {
                  const resource = entry.resource;

                  const treeNode = {
                    text: resource.name,
                    data: { id: resource.resourceType + "/" + resource.id },
                    isBatch: true,
                  };

                  nodes.push(treeNode);
                }
              });

              if (resp.data.link != null) {
                const next = resp.data.link.find(
                  (element) => element.relation === "next"
                );

                if (next != null) {
                  const treeNode = {
                    text: "...",
                    data: { url: next.url, node: node },
                    isBatch: true,
                  };

                  nodes.push(treeNode);
                }
              }
            }

            return nodes;
          });
      }
    },
    handleClick(node) {
      this.getLocations(node);
    },
    getLocations(node) {
      // Expand a normal node

      // First build the search URL
      let url = this.fhirServerUrl + "/Location";

      const params = {
        organization: node.data.id,
      };

      this.$http
        .get(url, {
          params: params,
        })
        .then((resp) => {
          const nodes = [];

          if (resp.data.entry != null) {
            resp.data.entry.forEach((entry) => {
              if (entry.resource) {
                const resource = entry.resource;

                const treeNode = {
                  text: resource.name,
                  data: { id: resource.resourceType + "/" + resource.id },
                  isBatch: true,
                };

                nodes.push(treeNode);
              }
            });

            if (resp.data.link != null) {
              const next = resp.data.link.find(
                (element) => element.relation === "next"
              );

              if (next != null) {
                const treeNode = {
                  text: "...",
                  data: { url: next.url, node: node },
                  isBatch: true,
                };

                nodes.push(treeNode);
              }
            }
          }

          this.items = nodes;
          this.mode = "LIST";
        });
    },
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>