import UtmLatLng from 'utm-latlng';
import * as mgrs from 'mgrs';

const utmConverter = new UtmLatLng();

// UTM 结果类型定义
interface UTMResult {
  Easting: number;
  Northing: number;
  ZoneNumber: number;
  ZoneLetter: string;
}

/**
 * 将经纬度转换为UTM坐标
 */
export function toUTM(
  latitude: number,
  longitude: number
): { zone: string; easting: string; northing: string } {
  try {
    // utm-latlng 使用小写开头的 convertLatLngToUtm 方法
    const result = utmConverter.convertLatLngToUtm(latitude, longitude, 2);
    if (typeof result === 'string') {
      throw new Error(result);
    }
    const utmResult = result as UTMResult;
    return {
      zone: `${utmResult.ZoneNumber}${utmResult.ZoneLetter}`,
      easting: utmResult.Easting.toFixed(2),
      northing: utmResult.Northing.toFixed(2)
    };
  } catch (error) {
    console.error('UTM转换失败:', error);
    return {
      zone: 'N/A',
      easting: 'N/A',
      northing: 'N/A'
    };
  }
}

/**
 * 将经纬度转换为MGRS坐标
 */
export function toMGRS(latitude: number, longitude: number): string {
  try {
    return mgrs.forward([longitude, latitude], 5);
  } catch (error) {
    console.error('MGRS转换失败:', error);
    return 'N/A';
  }
}

/**
 * 将MGRS坐标转换为经纬度
 */
export function fromMGRS(mgrsString: string): { latitude: number; longitude: number } | null {
  try {
    const [longitude, latitude] = mgrs.inverse(mgrsString);
    return { latitude, longitude };
  } catch (error) {
    console.error('MGRS逆向转换失败:', error);
    return null;
  }
}

/**
 * 将UTM坐标转换为经纬度
 */
export function fromUTM(
  zoneNumber: number,
  zoneLetter: string,
  easting: number,
  northing: number
): { latitude: number; longitude: number } | null {
  try {
    // 库方法名是 convertUtmToLatLng（小写开头）
    const result = utmConverter.convertUtmToLatLng(easting, northing, zoneNumber, zoneLetter) as { lat: number; lng: number };
    return {
      latitude: result.lat,
      longitude: result.lng
    };
  } catch (error) {
    console.error('UTM逆向转换失败:', error);
    return null;
  }
}