import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomeRedirectView.vue'),
    meta: { title: '首页' }
  },
  {
    path: '/position',
    name: 'Position',
    component: () => import('@/views/PositionView.vue'),
    meta: { title: '位置信息' }
  },
  {
    path: '/motion',
    name: 'Motion',
    component: () => import('@/views/MotionView.vue'),
    meta: { title: '运动信息' }
  },
  {
    path: '/signal',
    name: 'Signal',
    component: () => import('@/views/SignalView.vue'),
    meta: { title: '信号信息' }
  },
  {
    path: '/sensor',
    name: 'Sensor',
    component: () => import('@/views/SensorView.vue'),
    meta: { title: '传感器' }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { title: '设置' }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;