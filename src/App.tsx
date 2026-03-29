/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  Users, 
  Calendar, 
  Home, 
  Euro, 
  ArrowRight, 
  Plane, 
  Utensils, 
  Bed, 
  Info, 
  Download, 
  Mail,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles
} from 'lucide-react';
import { generateTripItinerary, TripData, TripItinerary, DayPlan, Coordinates } from './services/geminiService';
import MapView from './components/MapView';
import confetti from 'canvas-confetti';
import pptxgen from 'pptxgenjs';

type Step = 'start' | 'destination' | 'people' | 'dates' | 'type' | 'budget' | 'loading' | 'catalog';

export default function App() {
  const [step, setStep] = useState<Step>('start');
  const [data, setData] = useState<TripData>({
    startLocation: '',
    destination: '',
    travelers: 1,
    startDate: '',
    endDate: '',
    tripType: 'fixed',
    budget: 1000
  });
  const [itinerary, setItinerary] = useState<TripItinerary | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);

  const nextStep = () => {
    const steps: Step[] = ['start', 'destination', 'people', 'dates', 'type', 'budget'];
    const currentIndex = steps.indexOf(step as Step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    } else {
      handleGenerate();
    }
  };

  const prevStep = () => {
    const steps: Step[] = ['start', 'destination', 'people', 'dates', 'type', 'budget'];
    const currentIndex = steps.indexOf(step as Step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const handleGenerate = async () => {
    setStep('loading');
    try {
      const result = await generateTripItinerary(data);
      setItinerary(result);
      setStep('catalog');
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (error) {
      console.error(error);
      alert("Une erreur est survenue lors de la génération du voyage.");
      setStep('budget');
    }
  };

  const handleSendEmail = async () => {
    if (!email || !itinerary) return;
    setIsSending(true);
    try {
      // 1. Generate PPTX
      const pptxBase64 = await generatePPTXBase64();
      
      // 2. Send Email with PPTX
      const response = await fetch('/api/send-itinerary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          itinerary,
          pptxBase64
        }),
      });

      if (response.ok) {
        alert(`Le catalogue PowerPoint a été envoyé avec succès à ${email} !`);
        setEmail('');
      } else {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const error = await response.json();
          alert(`Erreur lors de l'envoi : ${error.message || 'Veuillez vérifier votre configuration Resend.'}`);
        } else {
          const text = await response.text();
          console.error("Server error response:", text);
          alert(`Erreur serveur : ${response.status} ${response.statusText}. L'envoi a échoué.`);
        }
      }
    } catch (error) {
      console.error(error);
      alert("Une erreur est survenue lors de la génération ou de l'envoi du PowerPoint.");
    } finally {
      setIsSending(false);
    }
  };

  const generatePPTXBase64 = async (): Promise<string> => {
    const pres = new pptxgen();
    
    // 1. Title Slide
    const slide1 = pres.addSlide();
    slide1.background = { color: itinerary!.colorPalette.primary.replace('#', '') };
    slide1.addText(itinerary!.destinationName, {
      x: 0.5, y: 1.5, w: '90%', h: 1.5,
      fontSize: 60, color: 'FFFFFF', bold: true, align: 'center', fontFace: 'Georgia'
    });
    slide1.addText(itinerary!.summary, {
      x: 1, y: 3.5, w: '80%', h: 1,
      fontSize: 18, color: 'FFFFFF', italic: true, align: 'center'
    });
    slide1.addText(`Voyage de ${data.startDate} à ${data.endDate}`, {
      x: 1, y: 4.5, w: '80%', h: 0.5,
      fontSize: 14, color: 'FFFFFF', align: 'center'
    });

    // 2. Day Slides
    const days = itinerary!.days || [];
    days.forEach((day) => {
      const slide = pres.addSlide();
      
      // Header
      slide.addText(`Jour ${day.day}: ${day.title}`, {
        x: 0.5, y: 0.3, w: '90%', h: 0.6,
        fontSize: 32, color: itinerary!.colorPalette.primary.replace('#', ''), bold: true, fontFace: 'Georgia'
      });

      // Activities
      let yPos = 1.2;
      slide.addText("Activités", { x: 0.5, y: yPos, w: 4, h: 0.4, fontSize: 18, bold: true, color: '666666' });
      yPos += 0.4;
      (day.activities || []).forEach((act) => {
        slide.addText(`• ${act.name}: ${act.description}`, {
          x: 0.5, y: yPos, w: 4.5, h: 0.8,
          fontSize: 11, color: '333333', bullet: true
        });
        yPos += 0.9;
      });

      // Right Column: Restaurants & Accommodation
      slide.addText("Gastronomie", { x: 5.5, y: 1.2, w: 4, h: 0.4, fontSize: 18, bold: true, color: '666666' });
      let restY = 1.6;
      (day.restaurants || []).forEach(rest => {
        slide.addText(`- ${rest.name}: ${rest.description}`, { x: 5.5, y: restY, w: 4, h: 0.6, fontSize: 10, color: '444444' });
        restY += 0.7;
      });

      slide.addText("Hébergement", { x: 5.5, y: 4.0, w: 4, h: 0.4, fontSize: 18, bold: true, color: '666666' });
      slide.addText(day.accommodation.name, { x: 5.5, y: 4.4, w: 4, h: 0.3, fontSize: 12, bold: true });
      slide.addText(day.accommodation.description, { x: 5.5, y: 4.7, w: 4, h: 0.6, fontSize: 10, color: '444444' });

      // Logistics Footer
      slide.addShape(pres.ShapeType.rect, { x: 0, y: 5.2, w: '100%', h: 0.4, fill: { color: 'F5F5F5' } });
      slide.addText(`Logistique: ${day.logistics.transportMode} | Distance: ${day.logistics.distance} | Temps: ${day.logistics.travelTime}`, {
        x: 0.5, y: 5.2, w: '90%', h: 0.4, fontSize: 10, color: '666666', align: 'center'
      });
    });

    // 3. Useful Info Slide
    const infoSlide = pres.addSlide();
    infoSlide.addText("Informations Utiles", {
      x: 0.5, y: 0.5, w: '90%', h: 0.8,
      fontSize: 40, color: itinerary!.colorPalette.primary.replace('#', ''), bold: true, fontFace: 'Georgia'
    });

    const info = itinerary!.usefulInfo;
    const infoItems = [
      { t: "Langue", c: info.language },
      { t: "Monnaie", c: info.currency },
      { t: "Transports", c: info.transport },
      { t: "Sécurité", c: info.safety },
      { t: "Internet", c: info.internet },
      { t: "Documents", c: info.documents }
    ];

    infoItems.forEach((item, idx) => {
      const row = Math.floor(idx / 2);
      const col = idx % 2;
      const x = 0.5 + (col * 4.5);
      const y = 1.5 + (row * 1.2);
      
      infoSlide.addText(item.t, { x, y, w: 4, h: 0.3, fontSize: 16, bold: true, color: itinerary!.colorPalette.primary.replace('#', '') });
      infoSlide.addText(item.c, { x, y: y + 0.3, w: 4, h: 0.7, fontSize: 11, color: '444444' });
    });

    const base64 = await pres.write({ outputType: 'base64' }) as string;
    return base64;
  };

  const renderFormStep = () => {
    switch (step) {
      case 'start':
        return (
          <FormStep 
            icon={<MapPin className="w-8 h-8 text-emerald-500" />}
            title="D'où partez-vous ?"
            description="Votre ville de départ pour calculer les trajets."
          >
            <input 
              type="text" 
              placeholder="Ex: Paris, France"
              className="w-full p-4 text-2xl border-b-2 border-emerald-500 focus:outline-none bg-transparent font-serif"
              value={data.startLocation}
              onChange={(e) => setData({ ...data, startLocation: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && data.startLocation && nextStep()}
              autoFocus
            />
          </FormStep>
        );
      case 'destination':
        return (
          <FormStep 
            icon={<Plane className="w-8 h-8 text-blue-500" />}
            title="Où souhaitez-vous aller ?"
            description="La destination de vos rêves."
          >
            <input 
              type="text" 
              placeholder="Ex: Bali, Indonésie"
              className="w-full p-4 text-2xl border-b-2 border-blue-500 focus:outline-none bg-transparent font-serif"
              value={data.destination}
              onChange={(e) => setData({ ...data, destination: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && data.destination && nextStep()}
              autoFocus
            />
          </FormStep>
        );
      case 'people':
        return (
          <FormStep 
            icon={<Users className="w-8 h-8 text-purple-500" />}
            title="Combien de voyageurs ?"
            description="Le nombre de personnes participant au voyage."
          >
            <div className="flex items-center gap-8">
              <button 
                onClick={() => setData({ ...data, travelers: Math.max(1, data.travelers - 1) })}
                className="w-12 h-12 rounded-full border-2 border-purple-500 flex items-center justify-center text-2xl"
              >-</button>
              <span className="text-5xl font-serif">{data.travelers}</span>
              <button 
                onClick={() => setData({ ...data, travelers: data.travelers + 1 })}
                className="w-12 h-12 rounded-full border-2 border-purple-500 flex items-center justify-center text-2xl"
              >+</button>
            </div>
          </FormStep>
        );
      case 'dates':
        return (
          <FormStep 
            icon={<Calendar className="w-8 h-8 text-orange-500" />}
            title="Quelles sont vos dates ?"
            description="Début et fin de votre aventure."
          >
            <div className="grid grid-cols-2 gap-4 w-full">
              <div>
                <label className="block text-sm uppercase tracking-widest mb-2 opacity-50">Départ</label>
                <input 
                  type="date" 
                  className="w-full p-4 border-b-2 border-orange-500 focus:outline-none bg-transparent"
                  value={data.startDate}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setData(prev => ({ ...prev, startDate: newDate, endDate: newDate }));
                  }}
                />
              </div>
              <div>
                <label className="block text-sm uppercase tracking-widest mb-2 opacity-50">Retour</label>
                <input 
                  type="date" 
                  className="w-full p-4 border-b-2 border-orange-500 focus:outline-none bg-transparent"
                  value={data.endDate}
                  onChange={(e) => setData({ ...data, endDate: e.target.value })}
                />
              </div>
            </div>
          </FormStep>
        );
      case 'type':
        return (
          <FormStep 
            icon={<Home className="w-8 h-8 text-indigo-500" />}
            title="Quel style de voyage ?"
            description="Préférez-vous rester au même endroit ou bouger ?"
          >
            <div className="grid grid-cols-2 gap-4 w-full">
              <button 
                onClick={() => setData({ ...data, tripType: 'fixed' })}
                className={`p-6 rounded-2xl border-2 transition-all ${data.tripType === 'fixed' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-200'}`}
              >
                <div className="font-bold mb-1">Logement Fixe</div>
                <div className="text-sm opacity-60">Un seul point d'ancrage</div>
              </button>
              <button 
                onClick={() => setData({ ...data, tripType: 'moving' })}
                className={`p-6 rounded-2xl border-2 transition-all ${data.tripType === 'moving' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-200'}`}
              >
                <div className="font-bold mb-1">Itinérant</div>
                <div className="text-sm opacity-60">Changement tous les 2-3 jours</div>
              </button>
            </div>
          </FormStep>
        );
      case 'budget':
        return (
          <FormStep 
            icon={<Euro className="w-8 h-8 text-rose-500" />}
            title="Quel est votre budget ?"
            description="Budget maximum par personne."
          >
            <div className="w-full">
              <input 
                type="range" 
                min="200" 
                max="10000" 
                step="100"
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
                value={data.budget}
                onChange={(e) => setData({ ...data, budget: parseInt(e.target.value) })}
              />
              <div className="text-center mt-4 text-4xl font-serif text-rose-500">
                {data.budget}€ <span className="text-sm text-gray-400">/ pers.</span>
              </div>
            </div>
          </FormStep>
        );
      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="mb-8"
            >
              <Loader2 className="w-16 h-16 text-emerald-500" />
            </motion.div>
            <h2 className="text-3xl font-serif mb-4">Préparation de votre catalogue...</h2>
            <p className="text-gray-500 max-w-md italic">
              "Nous explorons les meilleurs coins de {data.destination} pour vous créer une expérience inoubliable."
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  if (step === 'catalog' && itinerary) {
    const days = itinerary.days || [];
    const totalSlides = days.length + 2; // Intro + Days + Useful Info

    const renderSlide = () => {
      if (currentSlide === 0) {
        return (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="relative h-full flex flex-col items-center justify-center text-center p-12 overflow-hidden"
            style={{ backgroundColor: itinerary.colorPalette.primary + '10' }}
          >
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <img 
                src={`https://picsum.photos/seed/${itinerary.destinationName}/1920/1080?blur=2`} 
                className="w-full h-full object-cover"
                alt="Background"
                referrerPolicy="no-referrer"
              />
            </div>
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <span className="uppercase tracking-[0.3em] text-sm mb-4 block opacity-60">Votre Voyage Sur Mesure</span>
              <h1 className="text-7xl md:text-9xl font-serif mb-8" style={{ color: itinerary.colorPalette.primary }}>
                {itinerary.destinationName}
              </h1>
              <p className="text-xl max-w-2xl mx-auto leading-relaxed italic opacity-80">
                {itinerary.summary}
              </p>
            </motion.div>
            <div className="mt-12 flex gap-8 text-sm uppercase tracking-widest opacity-60">
              <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {data.startDate}</div>
              <div className="flex items-center gap-2"><Users className="w-4 h-4" /> {data.travelers} Pers.</div>
              <div className="flex items-center gap-2"><Euro className="w-4 h-4" /> {data.budget}€ / pers.</div>
            </div>
          </motion.div>
        );
      }

      if (currentSlide <= days.length) {
        const day = days[currentSlide - 1];
        return <DaySlide day={day} palette={itinerary.colorPalette} center={itinerary.centerCoords} destination={itinerary.destinationName} />;
      }

      return (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          className="h-full flex flex-col p-8 md:p-16 overflow-y-auto"
        >
          <h2 className="text-4xl font-serif mb-12" style={{ color: itinerary.colorPalette.primary }}>Informations Utiles</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <InfoCard icon={<Info />} title="Langue & Monnaie" content={`${itinerary.usefulInfo.language} | ${itinerary.usefulInfo.currency}`} />
            <InfoCard icon={<Plane />} title="Transports" content={itinerary.usefulInfo.transport} />
            <InfoCard icon={<Sparkles />} title="Sécurité" content={itinerary.usefulInfo.safety} />
            <InfoCard icon={<MapPin />} title="Connexion" content={itinerary.usefulInfo.internet} />
            <InfoCard icon={<Download />} title="Documents" content={itinerary.usefulInfo.documents} />
            <InfoCard icon={<Sparkles />} title="Santé" content={itinerary.usefulInfo.vaccinations} />
          </div>

          <div className="mt-auto pt-16 pb-32 border-t border-gray-100">
            <div className="max-w-md mx-auto text-center">
              <h3 className="text-xl font-serif mb-4">Recevoir ce catalogue</h3>
              <div className="flex gap-2 mb-12">
                <input 
                  type="email" 
                  placeholder="votre@email.com"
                  className="flex-1 p-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': itinerary.colorPalette.primary } as any}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button 
                  onClick={handleSendEmail}
                  disabled={isSending || !email}
                  className="px-6 py-3 rounded-lg text-white font-medium flex items-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: itinerary.colorPalette.primary }}
                >
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  Envoyer
                </button>
              </div>

              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setItinerary(null);
                  setCurrentSlide(0);
                  setData({
                    startLocation: '',
                    destination: '',
                    travelers: 1,
                    startDate: '',
                    endDate: '',
                    tripType: 'fixed',
                    budget: 1000
                  });
                  setStep('start');
                }}
                className="relative z-[2000] flex items-center gap-2 mx-auto px-6 py-3 rounded-full bg-black/5 text-black text-sm font-bold uppercase tracking-widest hover:bg-black/10 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Planifier un nouveau voyage
              </button>
            </div>
          </div>
        </motion.div>
      );
    };

    return (
      <div className="h-screen flex flex-col bg-white" id="catalog-container">
        <div className="flex-1 relative overflow-hidden">
          <AnimatePresence mode="wait">
            <div key={currentSlide} className="h-full">
              {renderSlide()}
            </div>
          </AnimatePresence>

          {/* Navigation Controls */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-between px-8 items-center">
            <button 
              onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
              className="p-4 rounded-full bg-white/50 backdrop-blur-sm hover:bg-white transition-all shadow-lg"
              disabled={currentSlide === 0}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            
            <div className="flex gap-2">
              {Array.from({ length: totalSlides }).map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1 rounded-full transition-all ${i === currentSlide ? 'w-8' : 'w-2 opacity-30'}`}
                  style={{ backgroundColor: itinerary.colorPalette.primary }}
                />
              ))}
            </div>

            <button 
              onClick={() => setCurrentSlide(Math.min(totalSlides - 1, currentSlide + 1))}
              className="p-4 rounded-full bg-white/50 backdrop-blur-sm hover:bg-white transition-all shadow-lg"
              disabled={currentSlide === totalSlides - 1}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#fdfcfb]">
      <AnimatePresence mode="wait">
        <motion.div 
          key={step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="w-full max-w-2xl"
        >
          {renderFormStep()}
          
          {step !== 'loading' && step !== 'catalog' && (
            <div className="mt-12 flex justify-between items-center">
              <button 
                onClick={prevStep}
                className={`text-gray-400 hover:text-gray-600 transition-colors ${step === 'start' ? 'invisible' : ''}`}
              >
                Retour
              </button>
              <button 
                onClick={nextStep}
                disabled={
                  (step === 'start' && !data.startLocation) ||
                  (step === 'destination' && !data.destination) ||
                  (step === 'dates' && (!data.startDate || !data.endDate))
                }
                className="bg-black text-white px-8 py-4 rounded-full font-medium flex items-center gap-2 hover:bg-gray-800 transition-all disabled:opacity-30"
              >
                {step === 'budget' ? 'Générer mon voyage' : 'Continuer'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function FormStep({ icon, title, description, children }: { icon: React.ReactNode, title: string, description: string, children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-6 p-4 rounded-2xl bg-white shadow-sm">{icon}</div>
      <h2 className="text-4xl font-serif mb-2">{title}</h2>
      <p className="text-gray-500 mb-12">{description}</p>
      {children}
    </div>
  );
}

function DaySlide({ day, palette, center, destination }: { day: DayPlan, palette: TripItinerary['colorPalette'], center: Coordinates, destination: string }) {
  const [view, setView] = useState<'info' | 'map'>('info');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(true);

  React.useEffect(() => {
    const fetchPhoto = async () => {
      setIsLoadingImage(true);
      try {
        const query = day.title.split(',')[0].trim();
        const response = await fetch(`/api/photos?query=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.photos && data.photos.length > 0) {
            setImageUrl(data.photos[0].src.large2x || data.photos[0].src.large);
          } else {
            setImageUrl(`https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1000&q=80`);
          }
        } else {
          setImageUrl(`https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1000&q=80`);
        }
      } catch (error) {
        console.error("Error fetching photo:", error);
        setImageUrl(`https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1000&q=80`);
      } finally {
        setIsLoadingImage(false);
      }
    };

    fetchPhoto();
  }, [day.title]);

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden">
      <div className="md:w-1/2 h-64 md:h-full relative">
        <AnimatePresence mode="wait">
          {view === 'info' ? (
            <motion.div 
              key="image-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full bg-gray-100 flex items-center justify-center"
            >
              {isLoadingImage ? (
                <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
              ) : (
                <img 
                  src={imageUrl || ''} 
                  className="w-full h-full object-cover"
                  alt={day.title}
                  referrerPolicy="no-referrer"
                />
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="map"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full p-4 bg-gray-50"
            >
              <MapView day={day} center={day.accommodation.coords || center} primaryColor={palette.primary} />
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="absolute top-8 left-8 bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-xl z-[1000]">
          <span className="text-sm uppercase tracking-widest opacity-60">Jour</span>
          <div className="text-4xl font-serif" style={{ color: palette.primary }}>{day.day < 10 ? `0${day.day}` : day.day}</div>
        </div>

        <div className="absolute bottom-8 left-8 flex gap-2 z-[1000]">
          <button 
            onClick={() => setView('info')}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${view === 'info' ? 'bg-black text-white' : 'bg-white/80 text-black hover:bg-white'}`}
          >
            Photos
          </button>
          <button 
            onClick={() => setView('map')}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${view === 'map' ? 'bg-black text-white' : 'bg-white/80 text-black hover:bg-white'}`}
          >
            Carte
          </button>
        </div>
      </div>
      <div className="md:w-1/2 p-8 md:p-16 overflow-y-auto bg-white">
        <h2 className="text-4xl font-serif mb-8" style={{ color: palette.primary }}>{day.title}</h2>
        
        <div className="space-y-12">
          <section>
            <div className="flex items-center gap-2 mb-4 opacity-40 uppercase tracking-widest text-xs font-bold">
              <MapPin className="w-4 h-4" /> Activités
            </div>
            <div className="space-y-6">
              {(day.activities || []).map((act, i) => (
                <div key={i}>
                  <h3 className="font-bold text-lg mb-1">{act.name}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed mb-2">{act.description}</p>
                  <p className="text-xs italic opacity-60" style={{ color: palette.secondary }}>{act.interest}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-2 gap-8">
            <section>
              <div className="flex items-center gap-2 mb-4 opacity-40 uppercase tracking-widest text-xs font-bold">
                <Utensils className="w-4 h-4" /> Gastronomie
              </div>
              {(day.restaurants || []).map((rest, i) => (
                <div key={i} className="mb-4">
                  <h4 className="font-bold text-sm">{rest.name}</h4>
                  <p className="text-xs text-gray-500">{rest.description}</p>
                </div>
              ))}
            </section>
            <section>
              <div className="flex items-center gap-2 mb-4 opacity-40 uppercase tracking-widest text-xs font-bold">
                <Bed className="w-4 h-4" /> Sommeil
              </div>
              <h4 className="font-bold text-sm">{day.accommodation.name}</h4>
              <p className="text-xs text-gray-500">{day.accommodation.description}</p>
            </section>
          </div>

          <section className="p-6 rounded-2xl bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-white shadow-sm">
                <Plane className="w-5 h-5" style={{ color: palette.accent }} />
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest opacity-40 font-bold">Logistique</div>
                <div className="text-sm font-medium">{day.logistics.transportMode}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold">{day.logistics.distance}</div>
              <div className="text-xs opacity-50">{day.logistics.travelTime}</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon, title, content }: { icon: React.ReactNode, title: string, content: string }) {
  return (
    <div className="p-6 rounded-2xl border border-gray-100 bg-gray-50/50">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-lg bg-white shadow-sm text-gray-400">{icon}</div>
        <h4 className="font-bold text-sm uppercase tracking-widest opacity-60">{title}</h4>
      </div>
      <p className="text-gray-700 leading-relaxed">{content}</p>
    </div>
  );
}
