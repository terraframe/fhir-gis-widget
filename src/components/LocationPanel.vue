<template>
  <div>
    <LiquorTree
      v-show="mode === 'TREE'"
      :options="treeOptions"
      @node:selected="onNodeSelected"
      ref="nodeTree"
    >
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
      <v-subheader> Managing Organizations of {{ node.text }} </v-subheader>
      <v-list-item v-for="(item, i) in items" :key="i">
        <v-list-item-content>
          <v-list-item-title v-text="item.text"></v-list-item-title>
        </v-list-item-content>
      </v-list-item>
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
      node: {},
      items: [],
      mode: "TREE",
    };
  },
  mounted() {},
  methods: {
    onNodeSelected(node) {
      // Handle the pagination node
      if (node.data != null && node.data.url != null) {
        this.getOrganizations(node);
      } else {
        this.$emit("select", node);
      }
    },
    createNodes(entries, links, parent) {
      const nodes = [];

      if (entries != null) {
        entries.forEach((entry) => {
          if (entry.resource) {
            const resource = entry.resource;

            const treeNode = {
              text: resource.name,
              data: { id: resource.resourceType + "/" + resource.id },
              isBatch: true,
            };

            if (
              resource.managingOrganization != null &&
              resource.managingOrganization.reference != null
            ) {
              treeNode.data.organization =
                resource.managingOrganization.reference;
            }

            nodes.push(treeNode);
          }
        });
      }

      if (links != null) {
        const next = links.find((element) => element.relation === "next");

        if (next != null) {
          const treeNode = {
            text: "...",
            data: { url: next.url, node: parent },
            isBatch: true,
          };

          nodes.push(treeNode);
        }
      }

      return nodes;
    },
    getNodes(node) {
      if (node.data != null && node.data.url != null) {
        // Handle the pagination node
        return this.$http.get(node.data.url, {}).then((resp) => {
          const nodes = this.createNodes(
            resp.data.entry,
            resp.data.link,
            node.data.node
          );

          nodes.forEach((treeNode) => {
            if (node.data.node.id === "root") {
              this.$refs.orgTree.append(treeNode);
            } else {
              node.data.node.append(treeNode);
            }
          });

          node.remove();

          return [];
        });
      } else {
        // Expand a normal node

        // First build the search URL
        let url = this.fhirServerUrl + "/Location";

        var params = new URLSearchParams();

        if (node.id === "root") {
          if (this.options.root != null) {
            if (this.options.includeRoot) {
              params.append("_id", this.options.root);
            } else {
              params.append('partof', this.options.root);
            }
          } else {
            params.append("partof:missing", true);
          }
        } else {
          params.append("partof", node.data.id);          
        }

        return this.$http
          .get(url, {
            params: params,
          })
          .then((resp) => {
            return this.createNodes(resp.data.entry, resp.data.link, node);
          });
      }
    },
    handleClick(node) {
      this.node = node;
      this.getOrganizations(node);
    },
    getOrganizations(node) {
      if (node.data.organization != null) {
        let url = this.fhirServerUrl + "/Organization";

        const params = {
          _id: node.data.organization,
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