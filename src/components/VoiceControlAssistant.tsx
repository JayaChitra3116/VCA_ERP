import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Globe,
  Sparkles,
  X,
  FileText,
  Copy,
  Trash2,
  CheckCircle2,
  ArrowRight,
  HelpCircle,
  PlusCircle,
  List
} from 'lucide-react';

export interface VoiceNote {
  id: string;
  timestamp: string;
  lang: 'ta-IN' | 'en-IN';
  text: string;
  category: 'order' | 'general' | 'navigation';
}

interface VoiceControlAssistantProps {
  activePage: string;
  setActivePage: (page: string) => void;
  onOpenSalesBillWithCustomer?: (customerName: string, notes?: string) => void;
}

// Declarations for Web Speech API window extensions
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const VoiceControlAssistant: React.FC<VoiceControlAssistantProps> = ({
  activePage,
  setActivePage,
  onOpenSalesBillWithCustomer
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [selectedLang, setSelectedLang] = useState<'ta-IN' | 'en-IN'>('ta-IN');
  const [transcript, setTranscript] = useState<string>('');
  const [lastActionStatus, setLastActionStatus] = useState<string>('');
  const [isAudioFeedbackEnabled, setIsAudioFeedbackEnabled] = useState<boolean>(true);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // Stored Dictated Voice Notes/Orders
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>(() => {
    try {
      const saved = localStorage.getItem('vca_voice_orders_notes');
      return saved ? JSON.parse(saved) : [
        {
          id: '1',
          timestamp: new Date().toLocaleDateString('en-IN') + ' ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          lang: 'ta-IN',
          text: 'ராஜா ஃபப்ரிக்சுக்கு 100 மீட்டர் காட்டன் புடவை ஆர்டர் குறிப்பு',
          category: 'order'
        }
      ];
    } catch {
      return [];
    }
  });

  const recognitionRef = useRef<any>(null);

  // Save voice notes
  useEffect(() => {
    try {
      localStorage.setItem('vca_voice_orders_notes', JSON.stringify(voiceNotes));
    } catch (e) {
      console.error('Failed to save voice notes', e);
    }
  }, [voiceNotes]);

  // Audio Speech Synthesis function (Supports Tamil & English)
  const speakOut = (text: string, lang: 'ta-IN' | 'en-IN' = selectedLang) => {
    if (!isAudioFeedbackEnabled || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel(); // Stop ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'ta-IN' ? 'ta-IN' : 'en-IN';
      utterance.rate = 0.9; // Slightly slower speech for seniors
      utterance.pitch = 1.0;

      // Try to find a Tamil/Indian English voice if available
      const voices = window.speechSynthesis.getVoices();
      const matchVoice = voices.find(v => v.lang.startsWith(lang === 'ta-IN' ? 'ta' : 'en'));
      if (matchVoice) {
        utterance.voice = matchVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
    }
  };

  // Process and execute Voice Commands
  const processVoiceCommand = (spokenText: string) => {
    if (!spokenText.trim()) return;

    const textLower = spokenText.toLowerCase().trim();
    let handled = false;

    // --- 1. NAVIGATION COMMANDS (ENGLISH & TAMIL) ---
    const navMap: { [key: string]: { page: string; nameTa: string; nameEn: string } } = {
      // Dashboard
      'dashboard': { page: 'dashboard', nameTa: 'முகப்பு பகுதி திறக்கப்பட்டது', nameEn: 'Opening Dashboard' },
      'home': { page: 'dashboard', nameTa: 'முகப்பு பகுதி திறக்கப்பட்டது', nameEn: 'Opening Dashboard' },
      'முகப்பு': { page: 'dashboard', nameTa: 'முகப்பு பகுதி திறக்கப்பட்டது', nameEn: 'Opening Dashboard' },
      'டாஷ்போர்டு': { page: 'dashboard', nameTa: 'முகப்பு பகுதி திறக்கப்பட்டது', nameEn: 'Opening Dashboard' },
      'ஹோம்': { page: 'dashboard', nameTa: 'முகப்பு பகுதி திறக்கப்பட்டது', nameEn: 'Opening Dashboard' },
      
      // Order Noting
      'order noting': { page: 'orders', nameTa: 'ஆர்டர் குறிப்பு பகுதி திறக்கப்பட்டது', nameEn: 'Opening Order Noting' },
      'order': { page: 'orders', nameTa: 'ஆர்டர் குறிப்பு பகுதி திறக்கப்பட்டது', nameEn: 'Opening Order Noting' },
      'orders': { page: 'orders', nameTa: 'ஆர்டர் குறிப்பு பகுதி திறக்கப்பட்டது', nameEn: 'Opening Order Noting' },
      'ஆர்டர்': { page: 'orders', nameTa: 'ஆர்டர் குறிப்பு பகுதி திறக்கப்பட்டது', nameEn: 'Opening Order Noting' },

      // Quality Control & Varieties
      'quality': { page: 'quality', nameTa: 'தரக் கட்டுப்பாடு மற்றும் ரகங்கள் திறக்கப்பட்டது', nameEn: 'Opening Quality Control' },
      'quality control': { page: 'quality', nameTa: 'தரக் கட்டுப்பாடு மற்றும் ரகங்கள் திறக்கப்பட்டது', nameEn: 'Opening Quality Control' },
      'sizing': { page: 'quality', nameTa: 'தரக் கட்டுப்பாடு மற்றும் ரகங்கள் திறக்கப்பட்டது', nameEn: 'Opening Quality Control' },
      'varieties': { page: 'quality', nameTa: 'துணி ரகங்கள் கட்லாக் திறக்கப்பட்டது', nameEn: 'Opening Varieties Catalog' },
      'variety': { page: 'quality', nameTa: 'துணி ரகங்கள் கட்லாக் திறக்கப்பட்டது', nameEn: 'Opening Varieties Catalog' },
      'துணி ரகங்கள்': { page: 'quality', nameTa: 'துணி ரகங்கள் கட்லாக் திறக்கப்பட்டது', nameEn: 'Opening Varieties Catalog' },
      'வெரைட்டி': { page: 'quality', nameTa: 'துணி ரகங்கள் கட்லாக் திறக்கப்பட்டது', nameEn: 'Opening Varieties Catalog' },
      'தரம்': { page: 'quality', nameTa: 'தரக் கட்டுப்பாடு பகுதி திறக்கப்பட்டது', nameEn: 'Opening Quality Control' },

      // Sales Bills
      'sales': { page: 'salesBills', nameTa: 'விற்பனை பில் பகுதி திறக்கப்பட்டது', nameEn: 'Opening Sales Bills' },
      'sales bill': { page: 'salesBills', nameTa: 'விற்பனை பில் பகுதி திறக்கப்பட்டது', nameEn: 'Opening Sales Bills' },
      'sales bills': { page: 'salesBills', nameTa: 'விற்பனை பில் பகுதி திறக்கப்பட்டது', nameEn: 'Opening Sales Bills' },
      'விற்பனை பில்': { page: 'salesBills', nameTa: 'விற்பனை பில் பகுதி திறக்கப்பட்டது', nameEn: 'Opening Sales Bills' },
      'விற்பனை': { page: 'salesBills', nameTa: 'விற்பனை பில் பகுதி திறக்கப்பட்டது', nameEn: 'Opening Sales Bills' },
      'பில் போடு': { page: 'salesBills', nameTa: 'விற்பனை பில் பகுதி திறக்கப்பட்டது', nameEn: 'Opening Sales Bills' },

      // Customer Ledger
      'ledger': { page: 'ledger', nameTa: 'வாடிக்கையாளர் கணக்கு லெட்ஜர் திறக்கப்பட்டது', nameEn: 'Opening Customer Ledger' },
      'customer ledger': { page: 'ledger', nameTa: 'வாடிக்கையாளர் கணக்கு லெட்ஜர் திறக்கப்பட்டது', nameEn: 'Opening Customer Ledger' },
      'வாடிக்கையாளர் கணக்கு': { page: 'ledger', nameTa: 'வாடிக்கையாளர் கணக்கு லெட்ஜர் திறக்கப்பட்டது', nameEn: 'Opening Customer Ledger' },
      'லெட்ஜர்': { page: 'ledger', nameTa: 'வாடிக்கையாளர் கணக்கு லெட்ஜர் திறக்கப்பட்டது', nameEn: 'Opening Customer Ledger' },
      'கணக்கு புத்தகம்': { page: 'ledger', nameTa: 'வாடிக்கையாளர் கணக்கு லெட்ஜர் திறக்கப்பட்டது', nameEn: 'Opening Customer Ledger' },

      // Customers
      'customers': { page: 'customers', nameTa: 'வாடிக்கையாளர் பட்டியல் திறக்கப்பட்டது', nameEn: 'Opening Customers' },
      'customer': { page: 'customers', nameTa: 'வாடிக்கையாளர் பட்டியல் திறக்கப்பட்டது', nameEn: 'Opening Customers' },
      'வாடிக்கையாளர்கள்': { page: 'customers', nameTa: 'வாடிக்கையாளர் பட்டியல் திறக்கப்பட்டது', nameEn: 'Opening Customers' },
      'கஸ்டமர்': { page: 'customers', nameTa: 'வாடிக்கையாளர் பட்டியல் திறக்கப்பட்டது', nameEn: 'Opening Customers' },

      // Purchase Bills
      'purchase': { page: 'purchaseBills', nameTa: 'கொள்முதல் பில் பகுதி திறக்கப்பட்டது', nameEn: 'Opening Purchase Bills' },
      'purchase bills': { page: 'purchaseBills', nameTa: 'கொள்முதல் பில் பகுதி திறக்கப்பட்டது', nameEn: 'Opening Purchase Bills' },
      'purchase bill': { page: 'purchaseBills', nameTa: 'கொள்முதல் பில் பகுதி திறக்கப்பட்டது', nameEn: 'Opening Purchase Bills' },
      'கொள்முதல் பில்': { page: 'purchaseBills', nameTa: 'கொள்முதல் பில் பகுதி திறக்கப்பட்டது', nameEn: 'Opening Purchase Bills' },
      'கொள்முதல்': { page: 'purchaseBills', nameTa: 'கொள்முதல் பில் பகுதி திறக்கப்பட்டது', nameEn: 'Opening Purchase Bills' },
      'பர்சேஸ்': { page: 'purchaseBills', nameTa: 'கொள்முதல் பில் பகுதி திறக்கப்பட்டது', nameEn: 'Opening Purchase Bills' },

      // Suppliers
      'suppliers': { page: 'suppliers', nameTa: 'சப்ளையர்கள் பட்டியல் திறக்கப்பட்டது', nameEn: 'Opening Suppliers' },
      'supplier': { page: 'suppliers', nameTa: 'சப்ளையர்கள் பட்டியல் திறக்கப்பட்டது', nameEn: 'Opening Suppliers' },
      'சப்ளையர்': { page: 'suppliers', nameTa: 'சப்ளையர்கள் பட்டியல் திறக்கப்பட்டது', nameEn: 'Opening Suppliers' },

      // Inventory / Stock
      'inventory': { page: 'inventory', nameTa: 'துணி இருப்பு ஸ்டாக் திறக்கப்பட்டது', nameEn: 'Opening Inventory Stock' },
      'stock': { page: 'inventory', nameTa: 'துணி இருப்பு ஸ்டாக் திறக்கப்பட்டது', nameEn: 'Opening Inventory Stock' },
      'ஸ்டாக்': { page: 'inventory', nameTa: 'துணி இருப்பு ஸ்டாக் திறக்கப்பட்டது', nameEn: 'Opening Inventory Stock' },
      'இருப்பு': { page: 'inventory', nameTa: 'துணி இருப்பு ஸ்டாக் திறக்கப்பட்டது', nameEn: 'Opening Inventory Stock' },

      // Production
      'production': { page: 'production', nameTa: 'உற்பத்தி மற்றும் தறி கணக்கு திறக்கப்பட்டது', nameEn: 'Opening Production' },
      'machine': { page: 'production', nameTa: 'உற்பத்தி மற்றும் தறி கணக்கு திறக்கப்பட்டது', nameEn: 'Opening Production' },
      'உற்பத்தி': { page: 'production', nameTa: 'உற்பத்தி மற்றும் தறி கணக்கு திறக்கப்பட்டது', nameEn: 'Opening Production' },
      'ப்ரொடக்ஷன்': { page: 'production', nameTa: 'உற்பத்தி மற்றும் தறி கணக்கு திறக்கப்பட்டது', nameEn: 'Opening Production' },
      'தறி': { page: 'production', nameTa: 'உற்பத்தி மற்றும் தறி கணக்கு திறக்கப்பட்டது', nameEn: 'Opening Production' },

      // Employees
      'employees': { page: 'employees', nameTa: 'ஊழியர்கள் மற்றும் சம்பள விவரம் திறக்கப்பட்டது', nameEn: 'Opening Employees' },
      'employee': { page: 'employees', nameTa: 'ஊழியர்கள் மற்றும் சம்பள விவரம் திறக்கப்பட்டது', nameEn: 'Opening Employees' },
      'salary': { page: 'employees', nameTa: 'ஊழியர்கள் மற்றும் சம்பள விவரம் திறக்கப்பட்டது', nameEn: 'Opening Employees' },
      'ஊழியர்கள்': { page: 'employees', nameTa: 'ஊழியர்கள் மற்றும் சம்பள விவரம் திறக்கப்பட்டது', nameEn: 'Opening Employees' },
      'வேலையாட்கள்': { page: 'employees', nameTa: 'ஊழியர்கள் மற்றும் சம்பள விவரம் திறக்கப்பட்டது', nameEn: 'Opening Employees' },
      'சம்பளம்': { page: 'employees', nameTa: 'ஊழியர்கள் மற்றும் சம்பள விவரம் திறக்கப்பட்டது', nameEn: 'Opening Employees' },

      // Settings
      'settings': { page: 'settings', nameTa: 'கம்பெனி அமைப்புகள் பகுதி திறக்கப்பட்டது', nameEn: 'Opening Company Settings' },
      'அமைப்புகள்': { page: 'settings', nameTa: 'கம்பெனி அமைப்புகள் பகுதி திறக்கப்பட்டது', nameEn: 'Opening Company Settings' },
      'செட்டிங்க்ஸ்': { page: 'settings', nameTa: 'கம்பெனி அமைப்புகள் பகுதி திறக்கப்பட்டது', nameEn: 'Opening Company Settings' }
    };

    // Check exact or partial phrase matching
    for (const key of Object.keys(navMap)) {
      if (textLower.includes(key)) {
        const item = navMap[key];
        setActivePage(item.page);
        const msg = selectedLang === 'ta-IN' ? item.nameTa : item.nameEn;
        setLastActionStatus(`✅ ${msg}`);
        speakOut(msg);
        handled = true;
        // Auto dismiss modal after 800ms so tab change is clearly seen
        setTimeout(() => {
          setIsOpen(false);
        }, 800);
        break;
      }
    }

    // --- 2. DICTATION / ORDER NOTING COMMANDS ---
    if (!handled) {
      // Treat as a voice note / order dictation
      const newNote: VoiceNote = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleDateString('en-IN') + ' ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        lang: selectedLang,
        text: spokenText,
        category: textLower.includes('order') || textLower.includes('ஆர்டர்') || textLower.includes('பில்') ? 'order' : 'general'
      };

      setVoiceNotes(prev => [newNote, ...prev]);

      const successMsg = selectedLang === 'ta-IN' 
        ? 'உங்கள் குரல் பதிவு வெற்றிகரமாக சேமிக்கப்பட்டது!' 
        : 'Voice note saved successfully!';
      
      setLastActionStatus(`📝 ${successMsg}`);
      speakOut(successMsg);
    }
  };

  // Initialize Speech Recognition
  const startListening = () => {
    const SpeechRecognitionApi = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionApi) {
      alert('Your browser does not support Web Speech Recognition. You can still use the 1-click voice command buttons below.');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

      const recognition = new SpeechRecognitionApi();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = selectedLang;

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript('');
        setLastActionStatus(selectedLang === 'ta-IN' ? 'கேட்கிறது... பேசுங்கள்...' : 'Listening... Speak now...');
        speakOut(selectedLang === 'ta-IN' ? 'பேசுங்கள்' : 'Listening', selectedLang);
      };

      recognition.onresult = (event: any) => {
        let currentText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript;
        }
        setTranscript(currentText);

        if (event.results[0].isFinal) {
          processVoiceCommand(currentText);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setLastActionStatus(
            selectedLang === 'ta-IN'
              ? '⚠️ மைக்ரோஃபோன் அனுமதி தேவை (Microphone Blocked). உலாவி முகவரிப் பட்டியில் அனுமதி அளிக்கவும் அல்லது கீழே உள்ள நேரடி பொத்தான்களைப் பயன்படுத்தவும்.'
              : '⚠️ Microphone permission blocked or denied. Please allow microphone in browser address bar or use the 1-click buttons below.'
          );
        } else if (event.error === 'no-speech') {
          setLastActionStatus(
            selectedLang === 'ta-IN'
              ? 'சப்தம் கேட்கவில்லை. மீண்டும் மைக்கை அழுத்தி பேசவும்.'
              : 'No speech detected. Please click the mic and try speaking again.'
          );
        } else {
          setLastActionStatus(
            selectedLang === 'ta-IN'
              ? `குரல் பதிவு பிழை: ${event.error}`
              : `Voice error: ${event.error}`
          );
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const handleDeleteNote = (id: string) => {
    setVoiceNotes(prev => prev.filter(n => n.id !== id));
  };

  return (
    <>
      {/* PROMINENT TOP-HEADER / FLOATING VOICE ASSISTANT TRIGGER BUTTON */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
        {/* Trigger Button with pulsing badge */}
        <button
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) {
              setLastActionStatus('');
            }
          }}
          className={`px-4 py-3 rounded-full shadow-2xl border-2 flex items-center gap-3 transition-all transform hover:scale-105 cursor-pointer font-bold ${
            isListening
              ? 'bg-rose-600 border-rose-300 text-white animate-pulse ring-4 ring-rose-300'
              : 'bg-[#182228] text-white border-[#8B5E1E] hover:bg-[#0D1419]'
          }`}
          title="Open Voice Control Assistant (தமிழ் & English)"
        >
          <div className={`p-2 rounded-full ${isListening ? 'bg-rose-700' : 'bg-[#8B5E1E]'}`}>
            <Mic className="w-6 h-6 text-white" />
          </div>
          <div className="text-left font-sans">
            <div className="text-xs font-mono font-extrabold text-amber-300 uppercase tracking-wide">
              {selectedLang === 'ta-IN' ? 'குரல் கட்டுப்பாடு' : 'Voice Control'}
            </div>
            <div className="text-sm font-bold leading-none mt-0.5">
              {isListening ? (selectedLang === 'ta-IN' ? 'கேட்கிறது...' : 'Listening...') : (selectedLang === 'ta-IN' ? 'பேசி கட்டுப்படுத்தலாம்' : 'Speak to Control')}
            </div>
          </div>
        </button>
      </div>

      {/* SENIOR-FRIENDLY VOICE ASSISTANT MODAL DIALOG */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-[#FAF8F3] border-2 border-[#8B5E1E] shadow-2xl max-w-2xl w-full max-h-[85vh] sm:max-h-[88vh] overflow-hidden flex flex-col rounded-xl my-auto">
            
            {/* Modal Header */}
            <div className="bg-[#182228] text-white p-3.5 sm:p-4 flex items-center justify-between border-b-2 border-[#8B5E1E] shrink-0 sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#8B5E1E] text-white rounded-lg shrink-0">
                  <Mic className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-serif font-bold text-white m-0 flex items-center gap-2">
                    <span>குரல் வழி கட்டுப்பாடு</span>
                    <span className="text-[10px] sm:text-xs font-mono text-amber-300 bg-[#283643] px-2 py-0.5 border border-[#3A4E5E]">
                      Senior Voice AI
                    </span>
                  </h2>
                  <p className="text-[11px] font-mono text-[#A8B8C8] m-0 mt-0.5">
                    தமிழ் மற்றும் English பேச்சு மூலம் பக்கங்களை திறக்கலாம்
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Audio Feedback Toggle */}
                <button
                  onClick={() => setIsAudioFeedbackEnabled(!isAudioFeedbackEnabled)}
                  className={`p-2 rounded border transition-colors cursor-pointer ${
                    isAudioFeedbackEnabled 
                      ? 'bg-[#283643] text-amber-300 border-amber-400' 
                      : 'bg-[#283643] text-slate-400 border-slate-600'
                  }`}
                  title={isAudioFeedbackEnabled ? 'Audio Feedback ON' : 'Audio Feedback OFF'}
                >
                  {isAudioFeedbackEnabled ? <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>

                <button
                  onClick={() => setIsOpen(false)}
                  aria-label="Close voice assistant"
                  className="p-2 bg-[#283643] hover:bg-[#384A59] text-amber-300 hover:text-white rounded-lg transition-colors cursor-pointer border border-amber-500/30 flex items-center justify-center shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto flex-1">

            {/* Language Selector & Main Controls */}
            <div className="p-4 sm:p-6 bg-[#EAE4D6] border-b border-[#D8D2C2] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Language Switcher */}
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-[#8B5E1E]" />
                  <span className="text-xs font-mono font-bold uppercase text-[#405262]">பேசும் மொழி (Language):</span>
                  <div className="flex border border-[#D0C8B8] bg-[#FAF8F3] p-0.5 font-bold text-xs">
                    <button
                      onClick={() => {
                        setSelectedLang('ta-IN');
                        if (isListening) startListening();
                      }}
                      className={`px-3 py-1.5 transition-colors cursor-pointer ${
                        selectedLang === 'ta-IN' ? 'bg-[#182228] text-white' : 'text-[#506272] hover:text-[#182228]'
                      }`}
                    >
                      தமிழ் (Tamil)
                    </button>
                    <button
                      onClick={() => {
                        setSelectedLang('en-IN');
                        if (isListening) startListening();
                      }}
                      className={`px-3 py-1.5 transition-colors cursor-pointer ${
                        selectedLang === 'en-IN' ? 'bg-[#182228] text-white' : 'text-[#506272] hover:text-[#182228]'
                      }`}
                    >
                      English
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setShowHelp(!showHelp)}
                  className="text-xs font-mono font-bold text-[#8B5E1E] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>{showHelp ? 'உதவி மறை' : 'என்ன பேசலாம்? (Help)'}</span>
                </button>
              </div>

              {/* High-Readability Speech Listening Box */}
              <div className="bg-[#FAF8F3] border-2 border-[#D0C8B8] p-5 rounded-lg text-center space-y-3">
                <div className="flex justify-center items-center gap-3">
                  <button
                    onClick={isListening ? stopListening : startListening}
                    className={`w-20 h-20 rounded-full flex flex-col items-center justify-center gap-1 shadow-lg transition-all transform hover:scale-105 cursor-pointer font-bold ${
                      isListening
                        ? 'bg-rose-600 text-white ring-8 ring-rose-200 animate-pulse'
                        : 'bg-[#182228] hover:bg-[#0D1419] text-white'
                    }`}
                  >
                    {isListening ? (
                      <>
                        <MicOff className="w-8 h-8 text-white" />
                        <span className="text-[10px] font-mono uppercase">நிறுத்து</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-8 h-8 text-amber-300" />
                        <span className="text-[10px] font-mono uppercase">பேசுங்கள்</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Big Transcribed Speech Text for Senior Readability (22px Font Size) */}
                <div className="min-h-[60px] flex items-center justify-center p-3 bg-[#EFECE4] border border-[#DDD7C9] rounded">
                  {transcript ? (
                    <div className="text-xl sm:text-2xl font-serif font-bold text-[#182228] tracking-wide">
                      "{transcript}"
                    </div>
                  ) : (
                    <div className="text-base font-mono text-[#607080] italic">
                      {isListening
                        ? (selectedLang === 'ta-IN' ? '🎙️ இப்போது பேசுங்கள்... உங்கள் வார்த்தைகள் இங்கு தோன்றும்.' : '🎙️ Listening now... Speak clearly.')
                        : (selectedLang === 'ta-IN' ? 'கீழே உள்ள கருப்பு பொத்தானை அழுத்தி பேசவும்' : 'Click the Microphone button above to start speaking')}
                    </div>
                  )}
                </div>

                {/* Status Indicator Bar */}
                {lastActionStatus && (
                  <div className="text-sm font-mono font-bold text-[#8B5E1E] bg-amber-50 p-2.5 border border-amber-200 rounded">
                    {lastActionStatus}
                  </div>
                )}

                {/* Manual Text Command Input Fallback */}
                <div className="pt-2 border-t border-[#DDD7C9] flex gap-2">
                  <input
                    type="text"
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && transcript.trim()) {
                        processVoiceCommand(transcript);
                      }
                    }}
                    placeholder={selectedLang === 'ta-IN' ? 'அல்லது இங்கு தட்டச்சு செய்து கட்டளையிடலாம்...' : 'Or type your command / order note here...'}
                    className="flex-1 p-2.5 bg-white border border-[#D0C8B8] font-serif text-sm font-bold text-[#182228]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (transcript.trim()) {
                        processVoiceCommand(transcript);
                      }
                    }}
                    className="px-4 py-2.5 bg-[#182228] hover:bg-[#0D1419] text-white font-mono text-xs font-bold uppercase cursor-pointer"
                  >
                    {selectedLang === 'ta-IN' ? 'இயக்கு' : 'Submit'}
                  </button>
                </div>
              </div>

              {/* Help & Examples Section */}
              {showHelp && (
                <div className="bg-white border border-[#D0C8B8] p-4 text-xs font-mono space-y-2">
                  <div className="font-bold text-[#182228] text-sm border-b pb-1">
                    🗣️ நீங்கள் பேசக்கூடிய சில உதராணங்கள் (Sample Commands):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#384A59]">
                    <div>• <strong>"விற்பனை பில்"</strong> (Sales Bills)</div>
                    <div>• <strong>"வாடிக்கையாளர் கணக்கு"</strong> (Customer Ledger)</div>
                    <div>• <strong>"கொள்முதல் பில்"</strong> (Purchase Bills)</div>
                    <div>• <strong>"ஸ்டாக்" / "இருப்பு"</strong> (Inventory)</div>
                    <div>• <strong>"உற்பத்தி"</strong> (Production)</div>
                    <div>• <strong>"ஊழியர்கள்"</strong> (Employees)</div>
                    <div className="col-span-1 sm:col-span-2 text-emerald-800 font-bold pt-1">
                      • ஆர்டர் குறிப்பு எடுக்க: <strong>"முருகன் ஃபப்ரிக்சுக்கு 100 மீட்டர் பட்டு புடவை ஆர்டர்"</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Preset Buttons (1-Click trigger without voice for easy access) */}
            <div className="p-4 bg-[#FAF8F3] space-y-3">
              <div className="text-xs font-mono font-bold uppercase text-[#405262] flex items-center justify-between">
                <span>நேரடி பக்க பொத்தான்கள் (1-Click Quick Jump):</span>
                <span className="text-[10px] text-[#708090]">Senior Large Buttons</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    setActivePage('salesBills');
                    setLastActionStatus('✅ விற்பனை பில் பக்கம் திறக்கப்பட்டது');
                    speakOut('விற்பனை பில் பக்கம் திறக்கப்பட்டது');
                    setTimeout(() => setIsOpen(false), 500);
                  }}
                  className="p-3 bg-[#EAE4D6] hover:bg-[#E5DFCE] text-[#182228] font-bold text-xs sm:text-sm border border-[#D0C8B8] rounded flex items-center gap-2 cursor-pointer text-left"
                >
                  <span className="w-3 h-3 bg-[#8B5E1E] rounded-full inline-block"></span>
                  <span>விற்பனை பில் (Sales)</span>
                </button>

                <button
                  onClick={() => {
                    setActivePage('ledger');
                    setLastActionStatus('✅ வாடிக்கையாளர் கணக்கு லெட்ஜர் திறக்கப்பட்டது');
                    speakOut('வாடிக்கையாளர் கணக்கு லெட்ஜர் திறக்கப்பட்டது');
                    setTimeout(() => setIsOpen(false), 500);
                  }}
                  className="p-3 bg-[#EAE4D6] hover:bg-[#E5DFCE] text-[#182228] font-bold text-xs sm:text-sm border border-[#D0C8B8] rounded flex items-center gap-2 cursor-pointer text-left"
                >
                  <span className="w-3 h-3 bg-[#8B5E1E] rounded-full inline-block"></span>
                  <span>வாடிக்கையாளர் லெட்ஜர்</span>
                </button>

                <button
                  onClick={() => {
                    setActivePage('inventory');
                    setLastActionStatus('✅ துணி இருப்பு ஸ்டாக் திறக்கப்பட்டது');
                    speakOut('துணி இருப்பு ஸ்டாக் திறக்கப்பட்டது');
                    setTimeout(() => setIsOpen(false), 500);
                  }}
                  className="p-3 bg-[#EAE4D6] hover:bg-[#E5DFCE] text-[#182228] font-bold text-xs sm:text-sm border border-[#D0C8B8] rounded flex items-center gap-2 cursor-pointer text-left"
                >
                  <span className="w-3 h-3 bg-[#8B5E1E] rounded-full inline-block"></span>
                  <span>துணி இருப்பு (Stock)</span>
                </button>

                <button
                  onClick={() => {
                    setActivePage('purchaseBills');
                    setLastActionStatus('✅ கொள்முதல் பில் திறக்கப்பட்டது');
                    speakOut('கொள்முதல் பில் திறக்கப்பட்டது');
                    setTimeout(() => setIsOpen(false), 500);
                  }}
                  className="p-3 bg-[#EAE4D6] hover:bg-[#E5DFCE] text-[#182228] font-bold text-xs sm:text-sm border border-[#D0C8B8] rounded flex items-center gap-2 cursor-pointer text-left"
                >
                  <span className="w-3 h-3 bg-[#8B5E1E] rounded-full inline-block"></span>
                  <span>கொள்முதல் பில் (Purchase)</span>
                </button>

                <button
                  onClick={() => {
                    setActivePage('production');
                    setLastActionStatus('✅ உற்பத்தி தறி கணக்கு திறக்கப்பட்டது');
                    speakOut('உற்பத்தி தறி கணக்கு திறக்கப்பட்டது');
                    setTimeout(() => setIsOpen(false), 500);
                  }}
                  className="p-3 bg-[#EAE4D6] hover:bg-[#E5DFCE] text-[#182228] font-bold text-xs sm:text-sm border border-[#D0C8B8] rounded flex items-center gap-2 cursor-pointer text-left"
                >
                  <span className="w-3 h-3 bg-[#8B5E1E] rounded-full inline-block"></span>
                  <span>உற்பத்தி (Production)</span>
                </button>

                <button
                  onClick={() => {
                    setActivePage('employees');
                    setLastActionStatus('✅ ஊழியர்கள் சம்பளம் திறக்கப்பட்டது');
                    speakOut('ஊழியர்கள் சம்பளம் திறக்கப்பட்டது');
                    setTimeout(() => setIsOpen(false), 500);
                  }}
                  className="p-3 bg-[#EAE4D6] hover:bg-[#E5DFCE] text-[#182228] font-bold text-xs sm:text-sm border border-[#D0C8B8] rounded flex items-center gap-2 cursor-pointer text-left"
                >
                  <span className="w-3 h-3 bg-[#8B5E1E] rounded-full inline-block"></span>
                  <span>ஊழியர்கள் (Employees)</span>
                </button>
              </div>
            </div>

            {/* Saved Dictated Voice Orders / Notes */}
            <div className="p-4 border-t border-[#D0C8B8] bg-[#FAF8F3] max-h-48 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold uppercase text-[#182228] flex items-center gap-1.5">
                  <List className="w-4 h-4 text-[#8B5E1E]" />
                  <span>பேசிய குறிப்புகள் மற்றும் ஆர்டர்கள் ({voiceNotes.length}):</span>
                </span>
              </div>

              {voiceNotes.length === 0 ? (
                <div className="text-xs font-mono text-[#708090] italic py-3 text-center">
                  குறிப்புகள் ஏதும் இல்லை. பேசுங்கள் சேமிக்கப்படும்.
                </div>
              ) : (
                <div className="space-y-2">
                  {voiceNotes.map((note) => (
                    <div key={note.id} className="p-2.5 bg-white border border-[#DDD7C9] rounded flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold font-serif text-[#182228] truncate">
                          "{note.text}"
                        </div>
                        <div className="text-[10px] font-mono text-[#708090] mt-0.5">
                          🕒 {note.timestamp}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(note.text);
                            alert('Copied voice note!');
                          }}
                          className="p-1.5 bg-[#EFECE4] hover:bg-[#E5DFCE] text-[#182228] rounded border border-[#D0C8B8] text-xs font-mono cursor-pointer"
                          title="Copy text"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded border border-rose-200 text-xs font-mono cursor-pointer"
                          title="Delete note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </div>

            {/* Modal Sticky Footer */}
            <div className="bg-[#EAE4D6] border-t border-[#D8D2C2] px-4 py-3 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-5 py-2 bg-[#182228] hover:bg-[#283643] text-amber-300 font-bold font-mono text-xs rounded-lg border border-amber-500/30 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <X className="w-4 h-4" />
                <span>மூடு (Close Window)</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
