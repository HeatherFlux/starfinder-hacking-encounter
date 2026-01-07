import { createRouter, createWebHashHistory } from 'vue-router'
import GMLayout from './components/layout/GMLayout.vue'
import PlayerLayout from './components/layout/PlayerLayout.vue'

const routes = [
  { path: '/', redirect: '/gm' },
  { path: '/gm', component: GMLayout, name: 'gm' },
  { path: '/player', component: PlayerLayout, name: 'player' }
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes
})
