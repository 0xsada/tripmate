require('dotenv').config();
const axios = require('axios');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate structured travel itinerary using Google Gemini API
 * @param {Object} params
 * @param {string} params.destination - e.g. "Manali"
 * @param {number|string} params.days - Number of days or duration
 * @param {string} [params.startDate] - e.g. "2025-06-01"
 * @param {string} [params.endDate] - e.g. "2025-06-05"
 * @param {string} [params.budget] - e.g. "₹15,000" or "Moderate"
 * @param {string} [params.travelStyle] - e.g. "Adventure", "Relaxed", "Cultural"
 * @param {string} [params.interests] - e.g. "Nature, Photography, Local Food"
 * @param {string} [params.additionalPreferences] - e.g. "Vegetarian food, pet friendly"
 * @returns {Promise<Object>} Structured travel itinerary JSON
 */
async function generateTripItinerary({
  destination,
  days = 3,
  startDate = '',
  endDate = '',
  budget = '',
  travelStyle = 'Balanced',
  interests = 'Sightseeing, Local Culture',
  additionalPreferences = ''
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in backend environment variables.');
  }

  const prompt = `
You are an expert AI Travel Planner.
Create a detailed, realistic, day-by-day travel itinerary for a trip with the following details:

- Destination: ${destination}
- Duration: ${days} day(s) ${startDate && endDate ? `(From ${startDate} to ${endDate})` : ''}
- Budget: ${budget || 'Flexible'}
- Travel Style: ${travelStyle || 'Balanced'}
- Interests: ${interests || 'General sightseeing, culture, nature'}
- Additional Preferences: ${additionalPreferences || 'None'}

IMPORTANT REQUIREMENTS:
1. Provide realistic activities for each day with accurate, real-world landmark/location names suitable for OpenStreetMap / Nominatim geocoding (e.g. "Solang Valley, Himachal Pradesh", "Hadimba Temple, Manali", "Mall Road, Manali").
2. Include short, engaging activity descriptions.
3. Return pure JSON ONLY. Do NOT include markdown code blocks, do NOT include HTML, and do NOT include any commentary outside the JSON.

Expected JSON format:
{
  "destination": "${destination}",
  "summary": "A concise summary of the trip highlights and experience",
  "estimated_budget": "${budget || 'Moderate'}",
  "travel_style": "${travelStyle || 'Balanced'}",
  "days": [
    {
      "day": 1,
      "title": "Short title for day 1 theme",
      "activities": [
        {
          "name": "Attraction or Activity Name",
          "description": "Short 1-2 sentence description of what to do here",
          "location": "Exact landmark/place name, City, Region (suitable for geocoding)"
        }
      ]
    }
  ]
}
`;

  // Candidate models verified to be available and responsive
  // Ordered from fastest/highest availability flash models to avoid 503 spikes
  const candidateModels = [
    'gemini-3.5-flash-lite',
    'gemini-3.6-flash',
    'gemini-3.8-flash',
    'gemini-3.7-flash',
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash'
  ];

  let lastError = null;

  for (const model of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          parts: [
            { text: prompt }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json'
      }
    };

    // Retry loop for temporary 503 high demand spikes or 429 rate limits
    const maxAttempts = 2;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await axios.post(url, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 45000
        });

        const candidates = response.data?.candidates;
        if (!candidates || candidates.length === 0) {
          throw new Error(`No itinerary candidates returned from Gemini (${model})`);
        }

        const rawText = candidates[0]?.content?.parts?.[0]?.text;
        if (!rawText) {
          throw new Error(`Empty text received from Gemini API (${model})`);
        }

        // Clean any markdown fences if present
        let cleanedText = rawText.trim();
        if (cleanedText.startsWith('```json')) {
          cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
        } else if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
        }

        let parsedJson;
        try {
          parsedJson = JSON.parse(cleanedText);
        } catch (parseErr) {
          console.error('Failed to parse Gemini JSON output:', cleanedText);
          throw new Error('Gemini returned an invalid JSON response: ' + parseErr.message);
        }

        // Validate the response structure
        validateItinerary(parsedJson);

        return parsedJson;
      } catch (error) {
        const status = error.response?.status;
        const errorMsg = error.response?.data?.error?.message || error.message;
        lastError = error;

        // If high demand spike (503) or rate limit (429), pause briefly before retrying or switching models
        if (status === 503 || status === 429) {
          if (attempt < maxAttempts) {
            console.warn(`[Gemini ${model}] Encountered status ${status} (high demand/rate limit). Retrying in 1.5s (attempt ${attempt}/${maxAttempts})...`);
            await sleep(1500);
            continue;
          } else {
            console.warn(`[Gemini ${model}] Status ${status} persisted. Falling back to next available model...`);
            break;
          }
        } else if (status === 404) {
          console.warn(`[Gemini ${model}] Model deprecated or not found (status 404). Falling back to next model...`);
          break; // Switch to next model immediately
        } else {
          console.warn(`[Gemini ${model}] Request error: ${errorMsg}. Trying next candidate...`);
          break;
        }
      }
    }
  }

  throw new Error(`Gemini itinerary generation failed: ${lastError?.response?.data?.error?.message || lastError?.message}`);
}

/**
 * Validates that the generated itinerary complies with required schema
 */
function validateItinerary(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid itinerary format: Expected a JSON object');
  }

  if (!data.destination || typeof data.destination !== 'string') {
    throw new Error('Invalid itinerary format: Missing or invalid "destination" string');
  }

  if (!Array.isArray(data.days) || data.days.length === 0) {
    throw new Error('Invalid itinerary format: "days" must be a non-empty array');
  }

  data.days.forEach((day, index) => {
    if (!day.activities || !Array.isArray(day.activities) || day.activities.length === 0) {
      throw new Error(`Invalid itinerary format: Day ${day.day || index + 1} has no activities`);
    }

    day.activities.forEach((act, actIdx) => {
      if (!act.name || !act.location) {
        throw new Error(`Invalid itinerary format: Activity #${actIdx + 1} on Day ${day.day || index + 1} is missing a name or location`);
      }
    });
  });

  return true;
}

module.exports = {
  generateTripItinerary,
  validateItinerary
};
