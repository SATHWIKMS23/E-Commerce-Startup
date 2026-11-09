import axios from "axios";
import { logger } from "../../../config/logger.js";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteResult {
  distanceKm: number;
  durationMins: number;
  polyline?: string;
  source: "GOOGLE_MAPS" | "FALLBACK_CALCULATION";
  navigationUrl: string;
}

export const haversineDistanceKm = (a: LatLng, b: LatLng): number => {
  const toRadians = (deg: number) => (deg * Math.PI) / 180;
  const lat1 = Number(a.lat);
  const lon1 = Number(a.lng);
  const lat2 = Number(b.lat);
  const lon2 = Number(b.lng);

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const earthRadiusKm = 6371;

  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * sinLon * sinLon;
  const straightLine = 2 * earthRadiusKm * Math.asin(Math.sqrt(h));

  // Indian urban road winding factor (1.35x straight line)
  return Math.round(straightLine * 1.35 * 100) / 100;
};

export class GoogleMapsService {
  private static getApiKey(): string {
    return (
      process.env.GOOGLE_MAPS_SERVER_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      ""
    );
  }

  static getNavigationUrl(destination: LatLng): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}`;
  }

  static async calculateRoute(
    origin: LatLng,
    destination: LatLng
  ): Promise<RouteResult> {
    const apiKey = this.getApiKey();

    if (apiKey) {
      try {
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&mode=driving&key=${apiKey}`;
        const response = await axios.get(url, { timeout: 4000 });

        if (
          response.data &&
          response.data.status === "OK" &&
          response.data.routes &&
          response.data.routes.length > 0
        ) {
          const route = response.data.routes[0];
          const leg = route.legs[0];
          const distanceMeters = leg.distance?.value || 0;
          const durationSeconds = leg.duration?.value || 0;

          return {
            distanceKm: Math.round((distanceMeters / 1000) * 100) / 100,
            durationMins: Math.max(1, Math.round(durationSeconds / 60)),
            polyline: route.overview_polyline?.points,
            source: "GOOGLE_MAPS",
            navigationUrl: this.getNavigationUrl(destination),
          };
        }
      } catch (err: any) {
        logger.warn(
          `[GoogleMapsService] Directions API error, falling back: ${err?.message}`
        );
      }
    }

    // High accuracy fallback calculation when API key not yet configured
    const distKm = haversineDistanceKm(origin, destination);
    // Average urban two-wheeler speed in Mysuru is ~25 km/h
    const estimatedMinutes = Math.max(5, Math.round((distKm / 25) * 60));

    return {
      distanceKm: Math.max(0.5, distKm),
      durationMins: estimatedMinutes,
      source: "FALLBACK_CALCULATION",
      navigationUrl: this.getNavigationUrl(destination),
    };
  }

  static async geocodeAddress(
    address: string,
    cityHint = "Mysuru"
  ): Promise<LatLng | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return null;
    }

    try {
      const fullQuery = `${address}, ${cityHint}, Karnataka, India`;
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        fullQuery
      )}&key=${apiKey}`;
      const response = await axios.get(url, { timeout: 4000 });

      if (
        response.data &&
        response.data.status === "OK" &&
        response.data.results?.length > 0
      ) {
        const loc = response.data.results[0].geometry.location;
        return {
          lat: loc.lat,
          lng: loc.lng,
        };
      }
    } catch (err: any) {
      logger.warn(`[GoogleMapsService] Geocode error: ${err?.message}`);
    }

    return null;
  }
}
