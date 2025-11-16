# gas-maps
Shows gas prices at gas stations nearby a route so you can pick the best gas station to refuel up at based on the price and distance.

## Fuel price API scaffolding

This repo now ships with a lightweight fuel-price client (`services/fuel-prices.ts`) and hook (`hooks/use-fuel-prices.ts`) that hydrate the UI whenever remote data is present. To wire up your provider:

1. Expose a POST endpoint that accepts `{ stops: string[] }` and returns an object that matches `FuelPriceResponse` (see `services/fuel-prices.ts` for the contract).
2. Create a `.env` entry (or edit `app.json`) with:
   ```
   EXPO_PUBLIC_FUEL_PRICE_API_URL=https://your-api.example.com
   EXPO_PUBLIC_FUEL_PRICE_API_KEY=superSecretToken
   ```
   Restart the Expo dev server after setting the values.
3. Optional: update the service to match your provider’s field names or authentication.

If the env vars are missing or the request fails, the app simply falls back to the baked-in sample prices so development never blocks on the network.
