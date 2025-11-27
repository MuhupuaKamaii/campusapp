# Google Maps Integration Setup Guide

This guide will help you set up Google Maps JavaScript API for your campus navigation system.

## Step 1: Get Your Google Maps API Key

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create a New Project (or select existing):**
   - Click on the project dropdown at the top
   - Click "New Project"
   - Name it (e.g., "Campus Navigation App")
   - Click "Create"

3. **Enable Maps JavaScript API:**
   - In the left sidebar, go to "APIs & Services" > "Library"
   - Search for "Maps JavaScript API"
   - Click on it and press "Enable"

4. **Enable Additional APIs (Optional but Recommended):**
   - **Places API** - For POI data
   - **Directions API** - For routing (if you want to use Google's routing)
   - **Geocoding API** - For address lookups

5. **Create API Key:**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy your API key (you'll need it in the next step)

6. **Restrict Your API Key (Important for Security):**
   - Click on your newly created API key
   - Under "Application restrictions", select "HTTP referrers"
   - Add your domain (e.g., `localhost:8000/*`, `yourdomain.com/*`)
   - Under "API restrictions", select "Restrict key"
   - Choose: Maps JavaScript API, Places API, Directions API
   - Click "Save"

## Step 2: Add API Key to Your Project

1. **Create or edit `.env` file in your project root:**
   ```bash
   VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

2. **Restart your Vite dev server:**
   ```bash
   npm run dev
   ```

## Step 3: Verify It's Working

1. Refresh your browser (hard refresh: `Ctrl+Shift+R`)
2. The map should now use Google Maps instead of MapLibre
3. You should see:
   - High-quality satellite imagery
   - Google Maps POIs and labels
   - All existing features (routing, 3D view, etc.)

## Free Tier Information

Google Maps Platform offers **$200/month in free credits**, which typically covers:
- ~28,000 map loads per month
- ~40,000 directions requests
- ~40,000 geocoding requests

For most development and small-scale applications, this is sufficient.

## Troubleshooting

**Map not showing:**
- Check browser console for errors
- Verify API key is correct in `.env` file
- Ensure Maps JavaScript API is enabled
- Check API key restrictions

**"This page can't load Google Maps correctly" error:**
- Check API key restrictions
- Ensure your domain is allowed in HTTP referrers
- Verify billing is enabled (even with free tier)

## Fallback Behavior

If no Google Maps API key is provided, the application will automatically use MapLibre (free, open-source) as a fallback. This ensures your app always works, even without a Google Maps API key.

## Cost Management

- Monitor usage in Google Cloud Console
- Set up billing alerts
- Use API key restrictions to prevent unauthorized use
- The free tier should cover most development needs



