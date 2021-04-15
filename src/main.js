import Vue from 'vue'
import axios from 'axios'
import VueAxios from 'vue-axios'
import { BootstrapVue, IconsPlugin } from 'bootstrap-vue'

import { library } from '@fortawesome/fontawesome-svg-core'
import { faSearch, faBars } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

// Import Bootstrap an BootstrapVue CSS files (order is important)
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'

library.add(faSearch, faBars)

Vue.component('font-awesome-icon', FontAwesomeIcon)

import App from './App.vue'
 
Vue.use(VueAxios, axios)
// Make BootstrapVue available throughout your project
Vue.use(BootstrapVue)
// Optionally install the BootstrapVue icon components plugin
Vue.use(IconsPlugin)

Vue.config.productionTip = false

new Vue({
  render: h => h(App),
}).$mount('#app')
