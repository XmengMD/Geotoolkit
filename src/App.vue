<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useSettingsStore } from '@/stores/settings';
import { useModuleLifecycleStore, type ModuleType } from '@/stores/moduleLifecycle';
import { usePermissions } from '@/composables/usePermissions';

const router = useRouter();
const route = useRoute();
const settingsStore = useSettingsStore();
const lifecycleStore = useModuleLifecycleStore();
const permissions = usePermissions();

// 当前激活的Tab
const activeTab = ref(route.name);

// 系统主题媒体查询
const systemThemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
let systemThemeListener: ((event: MediaQueryListEvent) => void) | null = null;

// 计算当前是否处于深色模式（处理 system 主题）
const isDarkMode = computed(() => {
  if (settingsStore.settings.theme === 'system') {
    return systemThemeMediaQuery.matches;
  }
  return settingsStore.settings.theme === 'dark';
});

// 监听系统主题变化
const setupSystemThemeListener = () => {
  systemThemeListener = (event: MediaQueryListEvent) => {
    if (settingsStore.settings.theme === 'system') {
      document.documentElement.classList.toggle('dark', event.matches);
    }
  };
  systemThemeMediaQuery.addEventListener('change', systemThemeListener);
};

// 清理系统主题监听
const cleanupSystemThemeListener = () => {
  if (systemThemeListener) {
    systemThemeMediaQuery.removeEventListener('change', systemThemeListener);
    systemThemeListener = null;
  }
};

// 模块名称到类型的映射
const moduleNameToType: Record<string, ModuleType> = {
  'Position': 'position',
  'Motion': 'motion',
  'Signal': 'signal',
  'Sensor': 'sensor'
};

// 所有导航项
const allNavItems = [
  { name: 'Position', label: '位置', icon: '📍', module: 'position' as ModuleType },
  { name: 'Motion', label: '运动', icon: '🚀', module: 'motion' as ModuleType },
  { name: 'Signal', label: '信号', icon: '📡', module: 'signal' as ModuleType },
  { name: 'Sensor', label: '传感器', icon: '⚙️', module: 'sensor' as ModuleType },
  { name: 'Settings', label: '设置', icon: '🔧', module: null }
];

// 根据模块启用状态过滤导航项
const navItems = computed(() => {
  return allNavItems.filter(item => {
    if (item.module === null) return true; // 设置始终显示
    return settingsStore.settings.enabledModules[item.module];
  });
});

// 切换Tab
const switchTab = async (name: string) => {
  activeTab.value = name;

  // 更新模块生命周期状态
  const moduleType = moduleNameToType[name];
  await lifecycleStore.switchTab(moduleType || null);

  router.push({ name });
};

onMounted(() => {
  setupSystemThemeListener();
});

onUnmounted(() => {
  cleanupSystemThemeListener();
});
</script>

<template>
  <div class="app-container" :class="{ 'dark': isDarkMode }">
    <!-- 主内容区 -->
    <main class="content-area">
      <router-view />
    </main>

    <!-- 底部导航栏 -->
    <nav class="bottom-nav">
      <button
        v-for="item in navItems"
        :key="item.name"
        class="nav-item"
        :class="{ active: activeTab === item.name }"
        @click="switchTab(item.name)"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        <span class="nav-label">{{ item.label }}</span>
      </button>
    </nav>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.content-area {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: 60px; /* 为底部导航留空间 */
}

.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  display: flex;
  justify-content: space-around;
  align-items: center;
  background: #1e1e1e;
  border-top: 1px solid #333;
  z-index: 100;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: #888;
  cursor: pointer;
  transition: all 0.3s;
  min-width: 60px;
}

.nav-item.active {
  color: #00bcd4;
}

.nav-icon {
  font-size: 24px;
  line-height: 1;
}

.nav-label {
  font-size: 12px;
  margin-top: 4px;
}

/* 浅色主题 */
.app-container:not(.dark) .bottom-nav {
  background: #f5f5f5;
  border-top: 1px solid #ddd;
}

.app-container:not(.dark) .nav-item {
  color: #666;
}

.app-container:not(.dark) .nav-item.active {
  color: #00bcd4;
}
</style>