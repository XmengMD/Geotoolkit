<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSettingsStore } from '@/stores/settings';
import { usePermissions } from '@/composables/usePermissions';

const router = useRouter();
const settingsStore = useSettingsStore();
const permissions = usePermissions();

onMounted(async () => {
  // 首次启动时申请权限
  await permissions.requestAllPermissions();

  // 如果所有模块都关闭，跳转到设置页面
  const enabledModules = settingsStore.settings.enabledModules;
  const hasEnabledModule = Object.values(enabledModules).some(enabled => enabled);

  if (!hasEnabledModule) {
    await router.replace({ name: 'Settings' });
  } else {
    // 找到第一个启用的模块并跳转
    const firstEnabledModule = Object.entries(enabledModules).find(([, enabled]) => enabled);
    if (firstEnabledModule) {
      const moduleRouteMap: Record<string, string> = {
        position: 'Position',
        motion: 'Motion',
        signal: 'Signal',
        sensor: 'Sensor'
      };
      await router.replace({ name: moduleRouteMap[firstEnabledModule[0]] });
    } else {
      await router.replace({ name: 'Settings' });
    }
  }
});
</script>

<template>
  <div class="home-redirect">
    <div class="loading">
      <div class="spinner"></div>
      <p>正在加载...</p>
    </div>
  </div>
</template>

<style scoped>
.home-redirect {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: 100vw;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #333;
  border-top: 4px solid #00bcd4;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

p {
  color: #888;
  font-size: 14px;
}
</style>