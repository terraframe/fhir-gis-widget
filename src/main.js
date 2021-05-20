import Vue from 'vue'
import axios from 'axios'
import VueAxios from 'vue-axios'
import LiquorTree from 'liquor-tree'

import { library } from '@fortawesome/fontawesome-svg-core'
import { faSearch, faBars, faMapPin, faAngleDoubleLeft } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

import App from './App.vue'
import vuetify from './plugins/vuetify'

library.add(faSearch, faBars, faMapPin, faAngleDoubleLeft)

Vue.component('font-awesome-icon', FontAwesomeIcon)
Vue.component(LiquorTree.name, LiquorTree)

Vue.use(VueAxios, axios)

Vue.config.productionTip = false

new Vue({
  vuetify,
  render: h => h(App)
}).$mount('#app')
