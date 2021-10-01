<template>
  <div>
    <LiquorTree v-show="mode === 'TREE'" :options="treeOptions" ref="orgTree">
      <span class="tree-text" slot-scope="{ node }">
        <template>
          {{ node.text }}
          <FontAwesomeIcon
            v-if="node.data == null || node.data.url == null"
            icon="map-pin"
            v-on:click.stop="onNodeSelected(node)"
          />
        </template>
      </span>
    </LiquorTree>
  </div>
</template>

<script>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import LiquorTree from "liquor-tree";
import fhirpath from "fhirpath";

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
    createNodes(entries, links, parent) {
      const nodes = [];

      if (entries != null) {
        entries.forEach((entry) => {
          if (entry.resource) {
            const resource = entry.resource;

            if (parent.id !== "root") {
              const exp =
                "Organization.extension('" +
                this.options.hierarchyExtension.url +
                "')";

              const orgs = fhirpath.evaluate(resource, exp);

              const labels = [];

              orgs.forEach((org) => {
                const hierarchyType = org.extension.filter(
                  (ext) => ext.url === "hierarchy-type"
                )[0];

                let hierarchyLabel = hierarchyType.valueCodeableConcept.text;

                // Just fallback to the first coding text
                if (
                  hierarchyLabel == null &&
                  hierarchyType.valueCodeableConcept.coding != null &&
                  hierarchyType.valueCodeableConcept.coding.length > 0
                ) {
                  hierarchyLabel =
                    hierarchyType.valueCodeableConcept.coding[0].display;
                }

                const partOf = org.extension.filter(
                  (ext) => ext.url === "part-of"
                )[0];
                const reference = partOf.valueReference.reference;

                if (reference === parent.data.id) {
                  labels.push(hierarchyLabel);
                }
              });

              if (labels.length > 0) {
                const treeNode = {
                  text: resource.name + " (" + labels.join(", ") + ")",
                  data: { id: resource.resourceType + "/" + resource.id },
                  isBatch: true,
                };

                nodes.push(treeNode);
              }
            } else {
              const treeNode = {
                text: resource.name,
                data: { id: resource.resourceType + "/" + resource.id },
                isBatch: true,
              };

              nodes.push(treeNode);
            }
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
        let url = this.fhirServerUrl + "/Organization";

        var params = new URLSearchParams();
        // params.append("_revinclude", "Location:organization");

        if (node.id === "root") {
          if (this.options.orgRoot != null) {
            if (this.options.includeRoot) {
              params.append("_id", this.options.orgRoot);
            } else {
              params.append(
                this.options.hierarchyExtension.parameter,
                this.options.orgRoot
              );
            }
          } else {
            params.append(
              this.options.hierarchyExtension.parameter + ":missing",
              true
            );
          }
        } else {
          // params.append("partof", node.data.id);
          params.append(
            this.options.hierarchyExtension.parameter,
            node.data.id
          );
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
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>