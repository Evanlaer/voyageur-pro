import { GoogleGenAI, Type } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY;

export interface TripData {
  startLocation: string;
  destination: string;
  travelers: number;
  startDate: string;
  endDate: string;
  tripType: 'fixed' | 'moving';
  budget: number;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface DayPlan {
  day: number;
  title: string;
  activities: {
    name: string;
    description: string;
    interest: string;
    imagePrompt: string;
    coords: Coordinates;
  }[];
  restaurants: {
    name: string;
    description: string;
    imagePrompt: string;
    coords: Coordinates;
  }[];
  accommodation: {
    name: string;
    description: string;
    imagePrompt: string;
    coords: Coordinates;
  };
  logistics: {
    distance: string;
    travelTime: string;
    transportMode: string;
  };
}

export interface UsefulInfo {
  language: string;
  currency: string;
  transport: string;
  safety: string;
  internet: string;
  documents: string;
  vaccinations: string;
}

export interface TripItinerary {
  destinationName: string;
  summary: string;
  days: DayPlan[];
  usefulInfo: UsefulInfo;
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
  };
  centerCoords: Coordinates;
}

export const generateTripItinerary = async (data: TripData): Promise<TripItinerary> => {
  if (!API_KEY) throw new Error("Missing Gemini API Key");

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const prompt = `Génère un itinéraire de voyage professionnel et détaillé pour un voyage de ${data.startDate} à ${data.endDate} (${data.travelers} personnes) à ${data.destination} depuis ${data.startLocation}.
  Le type de voyage est : ${data.tripType === 'fixed' ? 'logement fixe' : 'logement qui change tous les 2-3 jours'}.
  Budget max par personne : ${data.budget}€.

  IMPORTANT POUR LA CARTE : 
  - Les coordonnées GPS (lat, lng) doivent être PRÉCISES et RÉELLES pour chaque lieu cité.
  - Ne pas inventer de coordonnées. Si un lieu est célèbre (ex: Tour Eiffel), utilise ses vraies coordonnées (48.8584, 2.2945).

  IMPORTANT POUR LES PHOTOS :
  - Pour chaque jour, fournis un "title" qui soit le nom de la ville ou du quartier principal visité (ex: "Montmartre, Paris").
  - Ce titre sera utilisé pour chercher une photo de haute qualité.

  L'itinéraire doit être structuré, attrayant et inclure pour chaque jour :
  - Des lieux à visiter avec explications et coordonnées GPS exactes.
  - Des restaurants recommandés avec coordonnées GPS exactes.
  - Un hébergement avec coordonnées GPS exactes.
  - La logistique (distance, temps, transport).
  - Des descriptions pour des images (imagePrompt).

  Ajoute aussi une section d'informations utiles (langue, monnaie, sécurité, etc.).
  Fournis également les coordonnées centrales de la destination pour la carte.
  Choisis une palette de couleurs (hex) qui correspond à l'ambiance de la destination.
  Réponds UNIQUEMENT en JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            destinationName: { type: Type.STRING },
            summary: { type: Type.STRING },
            centerCoords: {
              type: Type.OBJECT,
              properties: {
                lat: { type: Type.NUMBER },
                lng: { type: Type.NUMBER }
              }
            },
            days: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.NUMBER },
                  title: { type: Type.STRING },
                  activities: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        description: { type: Type.STRING },
                        interest: { type: Type.STRING },
                        imagePrompt: { type: Type.STRING },
                        coords: {
                          type: Type.OBJECT,
                          properties: {
                            lat: { type: Type.NUMBER },
                            lng: { type: Type.NUMBER }
                          }
                        }
                      }
                    }
                  },
                  restaurants: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        description: { type: Type.STRING },
                        imagePrompt: { type: Type.STRING },
                        coords: {
                          type: Type.OBJECT,
                          properties: {
                            lat: { type: Type.NUMBER },
                            lng: { type: Type.NUMBER }
                          }
                        }
                      }
                    }
                  },
                  accommodation: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      description: { type: Type.STRING },
                      imagePrompt: { type: Type.STRING },
                      coords: {
                        type: Type.OBJECT,
                        properties: {
                          lat: { type: Type.NUMBER },
                          lng: { type: Type.NUMBER }
                        }
                      }
                    }
                  },
                  logistics: {
                    type: Type.OBJECT,
                    properties: {
                      distance: { type: Type.STRING },
                      travelTime: { type: Type.STRING },
                      transportMode: { type: Type.STRING }
                    }
                  }
                }
              }
            },
            usefulInfo: {
              type: Type.OBJECT,
              properties: {
                language: { type: Type.STRING },
                currency: { type: Type.STRING },
                transport: { type: Type.STRING },
                safety: { type: Type.STRING },
                internet: { type: Type.STRING },
                documents: { type: Type.STRING },
                vaccinations: { type: Type.STRING }
              }
            },
            colorPalette: {
              type: Type.OBJECT,
              properties: {
                primary: { type: Type.STRING },
                secondary: { type: Type.STRING },
                accent: { type: Type.STRING }
              }
            }
          }
        }
      }
    });

    if (!response.text) {
      throw new Error("Le modèle n'a pas renvoyé de texte.");
    }

    return JSON.parse(response.text.trim()) as TripItinerary;
  } catch (error: any) {
    console.error("Gemini Error:", error);
    throw new Error(`Erreur Gemini: ${error.message || "Erreur inconnue"}`);
  }
};
