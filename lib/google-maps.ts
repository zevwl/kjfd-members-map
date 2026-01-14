import { Client } from "@googlemaps/google-maps-services-js";

const client = new Client({});

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY) {
    console.warn("Google Maps API Key missing. Skipping geocoding.");
    return null;
  }

  try {
    const response = await client.geocode({
      params: {
        address,
        key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY,
      },
    });

    if (response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    }
  } catch (error) {
    console.error("Geocoding error:", error);
  }
  return null;
}
