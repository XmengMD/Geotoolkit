/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}

// 扩展 utm-latlng 类型声明
interface UTMLatLng {
  convertLatLngToUtm(latitude: number, longitude: number, precision?: number): {
    Easting: number;
    Northing: number;
    ZoneNumber: number;
    ZoneLetter: string;
  } | string;
  convertUtmToLatLng(easting: number, northing: number, zoneNumber: number, zoneLetter: string): {
    lat: number;
    lng: number;
  };
}

declare module 'utm-latlng' {
  const UtmLatLng: { new(): UTMLatLng };
  export default UtmLatLng;
}

// 扩展 DeviceMotionEvent 以支持 iOS 13+ 的 requestPermission
interface DeviceMotionEventiOS extends DeviceMotionEvent {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

// 扩展 DeviceOrientationEvent 以支持 iOS 13+ 的 requestPermission
interface DeviceOrientationEventiOS extends DeviceOrientationEvent {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

declare global {
  interface DeviceMotionEvent {
    requestPermission?: () => Promise<'granted' | 'denied'>;
  }
  interface DeviceOrientationEvent {
    requestPermission?: () => Promise<'granted' | 'denied'>;
  }
}