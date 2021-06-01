<template>
  <div>
    <LiquorTree v-show="mode === 'TREE'" :options="treeOptions" ref="orgTree">
      <span class="tree-text" slot-scope="{ node }">
        <template>
          {{ node.text }}
          <FontAwesomeIcon
            v-if="node.data == null || node.data.url == null"
            icon="map-pin"
            v-on:click.stop="handleClick(node)"
          />
        </template>
      </span>
    </LiquorTree>
    <v-list v-if="mode === 'LIST'" dense>
      <v-list-item
        v-on:click="
          mode = 'TREE';
          items = [];
        "
      >
        <FontAwesomeIcon icon="angle-double-left" />
      </v-list-item>
      <v-subheader> Locations managed by {{ node.text }} </v-subheader>
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
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import LiquorTree from "liquor-tree";

export default {
  components: {
    FontAwesomeIcon,
    LiquorTree,
  },
  props: {
    fhirServerUrl: { type: String, required: true },
    options: { type: Object, required: true },
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
      node: {},
    };
  },
  mounted() {},
  methods: {
    onNodeSelected(node) {
      // Handle the pagination node
      if (node.data != null && node.data.url != null) {
        this.getLocations(node);
      } else {
        this.$emit("select", node);
      }
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
          if (this.options.orgRoot != null) {
            params["_id"] = this.options.orgRoot;
          }
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
      this.node = node;

      this.getLocations(node);
    },
    getLocations(node) {
      if (node.data != null && node.data.url != null) {
        this.$http.get(node.data.url, {}).then((resp) => {
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

                nodes.append(treeNode);
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

                nodes.append(treeNode);
              }
            }
          }

          this.items = this.items.concat(nodes);

          // Remove the clicked on node
          const index = this.items.findIndex(
            (n) => n.data.url != null && n.data.url === node.data.url
          );

          if (index != -1) {
            this.items = this.items.splice(index, 1);
          }
        });
      } else {
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
      }
    },
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>