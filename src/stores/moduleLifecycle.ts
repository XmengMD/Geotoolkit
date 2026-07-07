import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import type { ModuleActivation } from '@/types';
import { useSettingsStore } from './settings';

export type ModuleType = 'position' | 'motion' | 'signal' | 'sensor';

// 模块生命周期控制器接口
export interface ModuleController {
  start: () => Promise<void> | void;
  stop: () => Promise<void> | void;
  isActive: boolean;
}

export const useModuleLifecycleStore = defineStore('moduleLifecycle', () => {
  const settingsStore = useSettingsStore();

  // 模块注册表
  const moduleControllers = new Map<ModuleType, ModuleController>();

  // 当前活跃的Tab
  const activeTab = ref<ModuleType | null>(null);

  // 模块激活状态（基于Tab和设置）
  const moduleActivation = ref<ModuleActivation>({
    position: false,
    motion: false,
    signal: false,
    sensor: false
  });

  // 各模块是否正在运行
  const runningModules = ref<ModuleActivation>({
    position: false,
    motion: false,
    signal: false,
    sensor: false
  });

  // 注册模块控制器
  const registerModule = (module: ModuleType, controller: ModuleController) => {
    moduleControllers.set(module, controller);
  };

  // 注销模块控制器
  const unregisterModule = (module: ModuleType) => {
    moduleControllers.delete(module);
  };

  // 启动模块
  const startModule = async (module: ModuleType) => {
    const controller = moduleControllers.get(module);
    if (!controller) return;

    // 检查模块是否已启用
    if (!settingsStore.settings.enabledModules[module]) {
      return;
    }

    // 如果已经在运行，不重复启动
    if (runningModules.value[module]) return;

    try {
      await controller.start();
      runningModules.value[module] = true;
    } catch (error) {
      console.error(`启动模块 ${module} 失败:`, error);
    }
  };

  // 停止模块
  const stopModule = async (module: ModuleType) => {
    const controller = moduleControllers.get(module);
    if (!controller) return;

    // 如果已经停止，不重复停止
    if (!runningModules.value[module]) return;

    try {
      await controller.stop();
      runningModules.value[module] = false;
    } catch (error) {
      console.error(`停止模块 ${module} 失败:`, error);
    }
  };

  // 切换到指定Tab
  const switchTab = async (module: ModuleType | null) => {
    // 停止之前Tab的模块
    if (activeTab.value && activeTab.value !== module) {
      await stopModule(activeTab.value);
    }

    activeTab.value = module;

    // 启动新Tab的模块（如果已启用）
    if (module) {
      await startModule(module);
    }
  };

  // 更新模块激活状态
  const updateModuleActivation = () => {
    moduleActivation.value = {
      position: settingsStore.settings.enabledModules.position && activeTab.value === 'position',
      motion: settingsStore.settings.enabledModules.motion && activeTab.value === 'motion',
      signal: settingsStore.settings.enabledModules.signal && activeTab.value === 'signal',
      sensor: settingsStore.settings.enabledModules.sensor && activeTab.value === 'sensor'
    };
  };

  // 监听设置和Tab变化，更新激活状态
  watch(
    [() => settingsStore.settings.enabledModules, () => activeTab.value],
    updateModuleActivation,
    { deep: true, immediate: true }
  );

  // 监听模块启用状态变化，如果禁用了当前运行的模块则停止
  watch(
    () => settingsStore.settings.enabledModules,
    async (enabledModules) => {
      for (const module of Object.keys(enabledModules) as ModuleType[]) {
        if (!enabledModules[module] && runningModules.value[module]) {
          await stopModule(module);
        }
      }
    },
    { deep: true }
  );

  return {
    activeTab,
    moduleActivation,
    runningModules,
    registerModule,
    unregisterModule,
    startModule,
    stopModule,
    switchTab
  };
});