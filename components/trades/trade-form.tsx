// File: src/components/trades/trade-form.tsx
// ✅ COMPLETE - All original features + Fixed DateTime

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface TradeFormData {
  symbol: string;
  asset_type: string;
  trade_type: string;
  entry_price: string;
  exit_price: string;
  stop_loss: string;
  target_price: string;
  quantity: string;
  position_size: string;
  entry_time: string;
  exit_time: string;
  timeframe: string;
  setup_type: string;
  reason: string;
}

interface TradeTemplate {
  name: string;
  data: Partial<TradeFormData>;
}

interface ValidationState {
  [key: string]: { valid: boolean; message: string };
}

const MARKET_HOURS = {
  stock: {
    name: 'Stock Market (NSE/BSE)',
    openTime: { hour: 9, minute: 15 },
    closeTime: { hour: 15, minute: 30 },
    weekends: false,
    timezone: 'Asia/Kolkata'
  },
  forex: {
    name: 'Forex Market',
    openTime: { hour: 0, minute: 0 },
    closeTime: { hour: 23, minute: 59 },
    weekends: false,
    timezone: 'UTC'
  },
  crypto: {
    name: 'Crypto Market',
    openTime: { hour: 0, minute: 0 },
    closeTime: { hour: 23, minute: 59 },
    weekends: true,
    timezone: 'UTC'
  },
  option: {
    name: 'Options Market',
    openTime: { hour: 9, minute: 15 },
    closeTime: { hour: 15, minute: 30 },
    weekends: false,
    timezone: 'Asia/Kolkata'
  }
};

const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

const isMarketOpen = (dateTime: Date, assetType: string): { valid: boolean; message: string } => {
  const marketConfig = MARKET_HOURS[assetType as keyof typeof MARKET_HOURS];
  if (!marketConfig) return { valid: true, message: '' };
  
  if (isWeekend(dateTime) && !marketConfig.weekends) {
    return {
      valid: false,
      message: `❌ ${marketConfig.name} is CLOSED on weekends`
    };
  }
  
  if (assetType === 'crypto') return { valid: true, message: '' };
  
  const hours = dateTime.getHours();
  const minutes = dateTime.getMinutes();
  const currentTimeInMinutes = hours * 60 + minutes;
  const openTimeInMinutes = marketConfig.openTime.hour * 60 + marketConfig.openTime.minute;
  const closeTimeInMinutes = marketConfig.closeTime.hour * 60 + marketConfig.closeTime.minute;

  if (currentTimeInMinutes < openTimeInMinutes || currentTimeInMinutes > closeTimeInMinutes) {
    return {
      valid: false,
      message: `❌ Market is CLOSED at this time`
    };
  }

  return { valid: true, message: '' };
};

export default function TradeForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  const [maxDateTime, setMaxDateTime] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [marketStatus, setMarketStatus] = useState<string>('');
  const [validation, setValidation] = useState<ValidationState>({});
  const [recentSymbols, setRecentSymbols] = useState<string[]>(['AAPL', 'NIFTY', 'BTCUSD', 'EURUSD']);
  const [showSymbolSuggestions, setShowSymbolSuggestions] = useState(false);
  const [templates, setTemplates] = useState<TradeTemplate[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [riskMetrics, setRiskMetrics] = useState({ riskAmount: 0, rrRatio: 0, percentRisk: 0 });
  
  // ✅ FIXED: Separate date and time states
  const [entryDate, setEntryDate] = useState('');
  const [entryTime, setEntryTime] = useState('');
  const [exitDate, setExitDate] = useState('');
  const [exitTime, setExitTime] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const symbolInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<TradeFormData>({
    symbol: '',
    asset_type: 'stock',
    trade_type: 'long',
    entry_price: '',
    exit_price: '',
    stop_loss: '',
    target_price: '',
    quantity: '',
    position_size: '',
    entry_time: '',
    exit_time: '',
    timeframe: '1d',
    setup_type: '',
    reason: '',
  });

  // Load templates from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('tradeTemplates');
    if (saved) {
      try {
        setTemplates(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load templates:', e);
      }
    }
    const savedSymbols = localStorage.getItem('recentSymbols');
    if (savedSymbols) {
      try {
        setRecentSymbols(JSON.parse(savedSymbols));
      } catch (e) {
        console.error('Failed to load recent symbols:', e);
      }
    }
  }, []);

  // Update max date/time and market status
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const formatted = `${year}-${month}-${day}`;
      
      setMaxDateTime(formatted);
      // ✅ FIXED: 24-hour format
      setCurrentTime(now.toLocaleString('en-IN', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }));

      const marketCheck = isMarketOpen(now, formData.asset_type);
      const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
      
      if (isWeekend(now) && formData.asset_type !== 'crypto') {
        setMarketStatus(`🔴 Market CLOSED (${dayName})`);
      } else if (marketCheck.valid) {
        setMarketStatus('🟢 Market OPEN');
      } else {
        setMarketStatus('🔴 Market CLOSED');
      }
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 60000);
    return () => clearInterval(interval);
  }, [formData.asset_type]);

  // ✅ Combine date and time for entry_time
  useEffect(() => {
    if (entryDate && entryTime) {
      const combined = `${entryDate}T${entryTime}`;
      setFormData(prev => ({ ...prev, entry_time: combined }));
    }
  }, [entryDate, entryTime]);

  // ✅ Combine date and time for exit_time
  useEffect(() => {
    if (exitDate && exitTime) {
      const combined = `${exitDate}T${exitTime}`;
      setFormData(prev => ({ ...prev, exit_time: combined }));
    } else if (!exitDate && !exitTime) {
      setFormData(prev => ({ ...prev, exit_time: '' }));
    }
  }, [exitDate, exitTime]);

  // Auto-calculate position size
  useEffect(() => {
    if (formData.entry_price && formData.quantity) {
      const entryPrice = parseFloat(formData.entry_price);
      const quantity = parseFloat(formData.quantity);
      if (!isNaN(entryPrice) && !isNaN(quantity)) {
        const positionSize = (entryPrice * quantity).toFixed(2);
        setFormData(prev => ({ ...prev, position_size: positionSize }));
      }
    }
  }, [formData.entry_price, formData.quantity]);

  // Calculate risk metrics
  useEffect(() => {
    const entry = parseFloat(formData.entry_price);
    const stopLoss = parseFloat(formData.stop_loss);
    const target = parseFloat(formData.target_price);
    const qty = parseFloat(formData.quantity);

    if (!isNaN(entry) && !isNaN(stopLoss) && !isNaN(qty)) {
      const riskPerShare = formData.trade_type === 'long' 
        ? entry - stopLoss 
        : stopLoss - entry;
      const riskAmount = Math.abs(riskPerShare * qty);
      const posSize = parseFloat(formData.position_size);
      const percentRisk = posSize > 0 ? (riskAmount / posSize) * 100 : 0;

      let rrRatio = 0;
      if (!isNaN(target) && riskPerShare !== 0) {
        const rewardPerShare = formData.trade_type === 'long'
          ? target - entry
          : entry - target;
        rrRatio = Math.abs(rewardPerShare / riskPerShare);
      }

      setRiskMetrics({ riskAmount, rrRatio, percentRisk });
    } else {
      setRiskMetrics({ riskAmount: 0, rrRatio: 0, percentRisk: 0 });
    }
  }, [formData.entry_price, formData.stop_loss, formData.target_price, formData.quantity, formData.position_size, formData.trade_type]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        router.push('/trades');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  const calculateProgress = () => {
    const requiredFields = ['symbol', 'entry_price', 'quantity', 'position_size'];
    const filled = requiredFields.filter(field => {
      const value = formData[field as keyof TradeFormData];
      return value && value.toString().trim() !== '';
    }).length;
    const hasEntryDateTime = entryDate && entryTime;
    const total = requiredFields.length + 1;
    return Math.round(((filled + (hasEntryDateTime ? 1 : 0)) / total) * 100);
  };

  // ✅ UTILITY: Check if date is a weekday (Mon-Fri)
  const isMarketDay = (dateString: string): boolean => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const day = date.getDay();
    return day !== 0 && day !== 6; // 0 = Sunday, 6 = Saturday
  };

  // ✅ UTILITY: Check if time is within market hours
  const isWithinMarketHours = (timeString: string, assetType: string): boolean => {
    if (!timeString) return false;
    if (assetType === 'crypto') return true; // Crypto 24/7
    
    const [hours, minutes] = timeString.split(':').map(Number);
    const timeInMinutes = hours * 60 + minutes;
    
    const config = MARKET_HOURS[assetType as keyof typeof MARKET_HOURS];
    const openTime = config.openTime.hour * 60 + config.openTime.minute;
    const closeTime = config.closeTime.hour * 60 + config.closeTime.minute;
    
    return timeInMinutes >= openTime && timeInMinutes <= closeTime;
  };

  // ✅ CRITICAL: Validate exit is AFTER entry
  const isExitAfterEntry = (
    entryDate: string, 
    entryTime: string, 
    exitDate: string, 
    exitTime: string
  ): { valid: boolean; message: string } => {
    if (!entryDate || !entryTime || !exitDate || !exitTime) {
      return { valid: true, message: '' }; // Not enough data to validate
    }

    const entryDateTime = new Date(`${entryDate}T${entryTime}`);
    const exitDateTime = new Date(`${exitDate}T${exitTime}`);

    if (exitDateTime <= entryDateTime) {
      return { 
        valid: false, 
        message: '❌ Exit time must be AFTER entry time!' 
      };
    }

    return { valid: true, message: '' };
  };

  const validateField = (name: string, value: string): { valid: boolean; message: string } => {
    if (name === 'symbol' && value) {
      return value.trim().length > 0 
        ? { valid: true, message: 'Valid symbol' }
        : { valid: false, message: 'Symbol required' };
    }
    if (name === 'entry_price' && value) {
      const price = parseFloat(value);
      return price > 0 
        ? { valid: true, message: 'Valid price' }
        : { valid: false, message: 'Price must be positive' };
    }
    if (name === 'quantity' && value) {
      const qty = parseInt(value);
      return qty > 0 
        ? { valid: true, message: 'Valid quantity' }
        : { valid: false, message: 'Quantity must be positive' };
    }
    return { valid: true, message: '' };
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    const validationResult = validateField(name, value);
    setValidation(prev => ({ ...prev, [name]: validationResult }));
  };

  // ✅ FIXED: Quick time setter with market awareness
  const setQuickTime = (type: 'now' | '1hour' | 'market-open' | 'market-close' | 'yesterday-close') => {
    const now = new Date();
    const marketConfig = MARKET_HOURS[formData.asset_type as keyof typeof MARKET_HOURS];
    let targetTime = new Date();

    if (type === 'now') {
      targetTime = now;
      const marketCheck = isMarketOpen(now, formData.asset_type);
      
      if (!marketCheck.valid && formData.asset_type !== 'crypto') {
        const today = new Date();
        today.setHours(marketConfig.closeTime.hour, marketConfig.closeTime.minute, 0, 0);
        
        if (isWeekend(now) || now.getHours() < marketConfig.openTime.hour) {
          targetTime = new Date(today);
          if (isWeekend(now)) {
            const day = now.getDay();
            const daysToSubtract = day === 0 ? 2 : 1;
            targetTime.setDate(targetTime.getDate() - daysToSubtract);
          } else {
            targetTime.setDate(targetTime.getDate() - 1);
          }
          targetTime.setHours(marketConfig.closeTime.hour, marketConfig.closeTime.minute, 0, 0);
        } else {
          targetTime = today;
        }
      }
    } else if (type === '1hour') {
      targetTime = new Date(now.getTime() - 60 * 60 * 1000);
      const marketCheck = isMarketOpen(targetTime, formData.asset_type);
      if (!marketCheck.valid && formData.asset_type !== 'crypto') {
        targetTime.setHours(marketConfig.closeTime.hour, marketConfig.closeTime.minute, 0, 0);
      }
    } else if (type === 'market-open') {
      targetTime = new Date();
      targetTime.setHours(marketConfig.openTime.hour, marketConfig.openTime.minute, 0, 0);
      
      if (isWeekend(targetTime) || targetTime > now) {
        const day = targetTime.getDay();
        if (day === 0) targetTime.setDate(targetTime.getDate() - 2);
        else if (day === 6) targetTime.setDate(targetTime.getDate() - 1);
        else if (targetTime > now) targetTime.setDate(targetTime.getDate() - 1);
      }
    } else if (type === 'market-close') {
      targetTime = new Date();
      targetTime.setHours(marketConfig.closeTime.hour, marketConfig.closeTime.minute, 0, 0);
      
      if (isWeekend(targetTime) || targetTime > now) {
        const day = targetTime.getDay();
        if (day === 0) targetTime.setDate(targetTime.getDate() - 2);
        else if (day === 6) targetTime.setDate(targetTime.getDate() - 1);
        else if (targetTime > now) targetTime.setDate(targetTime.getDate() - 1);
      }
    } else if (type === 'yesterday-close') {
      targetTime = new Date();
      targetTime.setDate(targetTime.getDate() - 1);
      
      if (isWeekend(targetTime)) {
        const day = targetTime.getDay();
        if (day === 0) targetTime.setDate(targetTime.getDate() - 2);
        else if (day === 6) targetTime.setDate(targetTime.getDate() - 1);
      }
      
      targetTime.setHours(marketConfig.closeTime.hour, marketConfig.closeTime.minute, 0, 0);
    }

    const year = targetTime.getFullYear();
    const month = String(targetTime.getMonth() + 1).padStart(2, '0');
    const day = String(targetTime.getDate()).padStart(2, '0');
    const hours = String(targetTime.getHours()).padStart(2, '0');
    const minutes = String(targetTime.getMinutes()).padStart(2, '0');
    
    setEntryDate(`${year}-${month}-${day}`);
    setEntryTime(`${hours}:${minutes}`);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleImageFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert('⚠️ File too large! Maximum size is 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('⚠️ Please select an image file');
      return;
    }

    setUploadingImage(true);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload,
      });

      const data = await response.json();
      
      if (response.ok && data.url) {
        setScreenshotUrl(data.url);
        alert('✅ Screenshot uploaded successfully!');
      } else {
        alert('❌ Upload failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error: any) {
      alert('❌ Upload error: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageFile(file);
    }
  };

  const saveTemplate = () => {
    if (!newTemplateName.trim()) {
      alert('Please enter a template name');
      return;
    }
    const newTemplate: TradeTemplate = {
      name: newTemplateName,
      data: {
        asset_type: formData.asset_type,
        trade_type: formData.trade_type,
        timeframe: formData.timeframe,
        setup_type: formData.setup_type,
        stop_loss: formData.stop_loss,
        target_price: formData.target_price,
      }
    };
    const updated = [...templates, newTemplate];
    setTemplates(updated);
    localStorage.setItem('tradeTemplates', JSON.stringify(updated));
    setNewTemplateName('');
    setShowTemplateModal(false);
    alert('✅ Template saved!');
  };

  const loadTemplate = (template: TradeTemplate) => {
    setFormData(prev => ({ ...prev, ...template.data }));
    alert(`✅ Loaded template: ${template.name}`);
  };

  const deleteTemplate = (index: number) => {
    const updated = templates.filter((_, i) => i !== index);
    setTemplates(updated);
    localStorage.setItem('tradeTemplates', JSON.stringify(updated));
  };

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.symbol.trim()) {
      alert('⚠️ Symbol is required');
      return;
    }
    
    if (!formData.entry_price || parseFloat(formData.entry_price) <= 0) {
      alert('⚠️ Valid entry price is required');
      return;
    }
    
    if (!formData.quantity || parseInt(formData.quantity) <= 0) {
      alert('⚠️ Valid quantity is required');
      return;
    }
    
    if (!formData.position_size || parseFloat(formData.position_size) <= 0) {
      alert('⚠️ Valid position size is required');
      return;
    }
    
    if (!entryDate || !entryTime) {
      alert('⚠️ Entry date and time are required');
      return;
    }

    // ✅ CRITICAL: Final validation before submit
    
    // Validate entry date is market day
    if (!isMarketDay(entryDate) && formData.asset_type !== 'crypto') {
      alert('❌ Entry date must be a weekday (Monday-Friday)!');
      return;
    }

    // Validate entry time is within market hours
    if (!isWithinMarketHours(entryTime, formData.asset_type)) {
      alert('❌ Entry time must be within market hours (09:15 - 15:30)!');
      return;
    }

    // Validate exit if provided
    if (exitDate || exitTime) {
      if (!exitDate || !exitTime) {
        alert('⚠️ Both exit date AND time are required if you want to close the trade');
        return;
      }

      // Validate exit date is market day
      if (!isMarketDay(exitDate) && formData.asset_type !== 'crypto') {
        alert('❌ Exit date must be a weekday (Monday-Friday)!');
        return;
      }

      // Validate exit time is within market hours
      if (!isWithinMarketHours(exitTime, formData.asset_type)) {
        alert('❌ Exit time must be within market hours (09:15 - 15:30)!');
        return;
      }

      // ✅ CRITICAL: Validate exit is AFTER entry
      const validation = isExitAfterEntry(entryDate, entryTime, exitDate, exitTime);
      if (!validation.valid) {
        alert(
          validation.message + 
          '\n\nEntry: ' + entryDate + ' at ' + entryTime + 
          '\nExit: ' + exitDate + ' at ' + exitTime +
          '\n\nPlease fix the exit time!'
        );
        return;
      }
    }

    setLoading(true);

    if (!recentSymbols.includes(formData.symbol.toUpperCase())) {
      const updated = [formData.symbol.toUpperCase(), ...recentSymbols].slice(0, 10);
      setRecentSymbols(updated);
      localStorage.setItem('recentSymbols', JSON.stringify(updated));
    }

    try {
      const tradeData = {
        ...formData,
        screenshot_url: screenshotUrl || null,
      };

      const response = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tradeData),
      });

      const data = await response.json();

      if (response.ok) {
        alert('✅ Trade added successfully!');
        router.push('/trades');
        router.refresh();
      } else {
        alert('❌ Error: ' + (data.error || 'Failed to save trade'));
      }
    } catch (error: any) {
      alert('❌ Submit error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const progress = calculateProgress();
  const marketInfo = MARKET_HOURS[formData.asset_type as keyof typeof MARKET_HOURS];

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Progress Bar */}
      <div className="mb-6 bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">Form Completion</span>
          <span className="text-sm font-bold text-blue-600">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Market Status */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🕐</span>
              <span className="text-sm font-semibold text-blue-900">Current Time</span>
            </div>
            <span className="text-lg font-bold text-blue-600">{currentTime}</span>
          </div>
          
          <div className="flex items-center justify-between pt-2 border-t border-blue-200">
            <span className="text-sm font-medium text-blue-900">
              Market Status ({marketInfo?.name || 'N/A'})
            </span>
            <span className="text-lg font-bold">{marketStatus}</span>
          </div>
        </div>

        {/* Template Section */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('templates')}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">📋</span>
              <h3 className="font-semibold text-gray-800">Trade Templates</h3>
            </div>
            <span className="text-gray-500">
              {collapsedSections.has('templates') ? '▼' : '▲'}
            </span>
          </div>
          
          {!collapsedSections.has('templates') && (
            <div className="mt-4">
              <div className="flex flex-wrap gap-2">
                {templates.map((template, idx) => (
                  <div key={idx} className="flex items-center gap-1 bg-blue-100 px-3 py-1 rounded-full">
                    <button
                      type="button"
                      onClick={() => loadTemplate(template)}
                      className="text-sm font-medium text-blue-700 hover:text-blue-900"
                    >
                      {template.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTemplate(idx)}
                      className="text-red-500 hover:text-red-700 font-bold"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(true)}
                  className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium hover:bg-green-600"
                >
                  + Save Current
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Basic Info Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div 
            className="flex items-center justify-between cursor-pointer mb-4"
            onClick={() => toggleSection('basic')}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">📊</span>
              <h3 className="font-semibold text-gray-800">Basic Information</h3>
            </div>
            <span className="text-gray-500">
              {collapsedSections.has('basic') ? '▼' : '▲'}
            </span>
          </div>

          {!collapsedSections.has('basic') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  💼 Symbol <span className="text-red-500">*</span>
                </label>
                <input
                  ref={symbolInputRef}
                  type="text"
                  name="symbol"
                  value={formData.symbol}
                  onChange={handleChange}
                  onFocus={() => setShowSymbolSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSymbolSuggestions(false), 200)}
                  placeholder="e.g., AAPL, NIFTY"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 uppercase ${
                    validation.symbol?.valid ? 'border-green-500' : 'border-gray-300'
                  }`}
                  required
                />
                {validation.symbol?.valid && (
                  <span className="absolute right-3 top-9 text-green-500">✓</span>
                )}
                {showSymbolSuggestions && recentSymbols.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                    {recentSymbols
                      .filter(s => s.includes(formData.symbol.toUpperCase()))
                      .map((symbol, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, symbol }));
                            setShowSymbolSuggestions(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50"
                        >
                          {symbol}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  🏦 Asset Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="asset_type"
                  value={formData.asset_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="stock">📈 Stock</option>
                  <option value="forex">💱 Forex</option>
                  <option value="crypto">₿ Crypto</option>
                  <option value="option">📊 Option</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  📈 Trade Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="trade_type"
                  value={formData.trade_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="long">🟢 Long (Buy)</option>
                  <option value="short">🔴 Short (Sell)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ⏱️ Timeframe
                </label>
                <select
                  name="timeframe"
                  value={formData.timeframe}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1min">1 Minute</option>
                  <option value="5min">5 Minutes</option>
                  <option value="15min">15 Minutes</option>
                  <option value="1h">1 Hour</option>
                  <option value="4h">4 Hours</option>
                  <option value="1d">1 Day</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  🎯 Setup Type
                </label>
                <select
                  name="setup_type"
                  value={formData.setup_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select setup</option>
                  <option value="breakout">🚀 Breakout</option>
                  <option value="pullback">🔄 Pullback</option>
                  <option value="range">↔️ Range</option>
                  <option value="reversal">🔃 Reversal</option>
                  <option value="trend">📈 Trend</option>
                  <option value="other">❓ Other</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Pricing Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div 
            className="flex items-center justify-between cursor-pointer mb-4"
            onClick={() => toggleSection('pricing')}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">💰</span>
              <h3 className="font-semibold text-gray-800">Pricing & Position</h3>
            </div>
            <span className="text-gray-500">
              {collapsedSections.has('pricing') ? '▼' : '▲'}
            </span>
          </div>

          {!collapsedSections.has('pricing') && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    💵 Entry Price <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="entry_price"
                    value={formData.entry_price}
                    onChange={handleChange}
                    placeholder="100.50"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      validation.entry_price?.valid ? 'border-green-500' : 'border-gray-300'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    🔢 Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    placeholder="10"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      validation.quantity?.valid ? 'border-green-500' : 'border-gray-300'
                    }`}
                    required
                  />
                  <div className="flex gap-2 mt-1">
                    {[10, 50, 100].map(qty => (
                      <button
                        key={qty}
                        type="button"
                        onClick={() => handleChange({ target: { name: 'quantity', value: qty.toString() } } as any)}
                        className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200"
                      >
                        {qty}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    💼 Position Size <span className="text-blue-500">*Auto</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="position_size"
                    value={formData.position_size}
                    readOnly
                    className="w-full px-3 py-2 border border-green-300 bg-green-50 rounded-lg"
                  />
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Auto: Entry Price × Quantity
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    💸 Exit Price (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="exit_price"
                    value={formData.exit_price}
                    onChange={handleChange}
                    placeholder="110.50"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    🛑 Stop Loss
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="stop_loss"
                    value={formData.stop_loss}
                    onChange={handleChange}
                    placeholder="95.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    🎯 Target Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="target_price"
                    value={formData.target_price}
                    onChange={handleChange}
                    placeholder="120.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {riskMetrics.riskAmount > 0 && (
                <div className="mt-4 p-4 bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-lg">
                  <h4 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
                    <span>⚠️</span>
                    Risk Analysis
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Risk Amount</p>
                      <p className="text-2xl font-bold text-red-600">
                        ₹{riskMetrics.riskAmount.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {riskMetrics.percentRisk.toFixed(2)}% of position
                      </p>
                    </div>
                    {riskMetrics.rrRatio > 0 && (
                      <div>
                        <p className="text-sm text-gray-600">Risk:Reward</p>
                        <p className={`text-2xl font-bold ${riskMetrics.rrRatio >= 2 ? 'text-green-600' : 'text-orange-600'}`}>
                          1:{riskMetrics.rrRatio.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {riskMetrics.rrRatio >= 2 ? '✅ Good' : '⚠️ Low'}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-600">Potential Profit</p>
                      <p className="text-2xl font-bold text-green-600">
                        ₹{(riskMetrics.riskAmount * riskMetrics.rrRatio).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">If target reached</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ✅ FIXED TIMING SECTION - Simplified */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div 
            className="flex items-center justify-between cursor-pointer mb-4"
            onClick={() => toggleSection('timing')}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">⏰</span>
              <h3 className="font-semibold text-gray-800">Trade Timing</h3>
            </div>
            <span className="text-gray-500">
              {collapsedSections.has('timing') ? '▼' : '▲'}
            </span>
          </div>

          {!collapsedSections.has('timing') && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">⚡ Quick Select (Market-Aware):</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickTime('now')}
                    className="px-3 py-1 bg-blue-500 text-white text-sm rounded-full hover:bg-blue-600"
                  >
                    {isMarketOpen(new Date(), formData.asset_type).valid || formData.asset_type === 'crypto' 
                      ? '⏰ Now' 
                      : '⏰ Last Close'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickTime('market-open')}
                    className="px-3 py-1 bg-green-500 text-white text-sm rounded-full hover:bg-green-600"
                  >
                    📈 Market Open (09:15)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickTime('market-close')}
                    className="px-3 py-1 bg-orange-500 text-white text-sm rounded-full hover:bg-orange-600"
                  >
                    📉 Market Close (15:30)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickTime('yesterday-close')}
                    className="px-3 py-1 bg-purple-500 text-white text-sm rounded-full hover:bg-purple-600"
                  >
                    📅 Yesterday Close
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickTime('1hour')}
                    className="px-3 py-1 bg-gray-500 text-white text-sm rounded-full hover:bg-gray-600"
                  >
                    🕐 1 Hr Ago
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🕐 Entry Date & Time <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <input
                      type="date"
                      value={entryDate}
                      onChange={(e) => {
                        const selectedDate = e.target.value;
                        
                        // ✅ Validate market day
                        if (!isMarketDay(selectedDate) && formData.asset_type !== 'crypto') {
                          alert('❌ Weekend trades not allowed! Select Monday-Friday only.');
                          return;
                        }
                        
                        setEntryDate(selectedDate);
                        
                        // ✅ Auto-clear exit if it becomes invalid
                        if (exitDate && selectedDate > exitDate) {
                          setExitDate('');
                          setExitTime('');
                        }
                      }}
                      max={maxDateTime}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <input
                      type="time"
                      value={entryTime}
                      onChange={(e) => {
                        const selectedTime = e.target.value;
                        
                        // ✅ Validate market hours
                        if (!isWithinMarketHours(selectedTime, formData.asset_type)) {
                          const config = MARKET_HOURS[formData.asset_type as keyof typeof MARKET_HOURS];
                          alert(`❌ Trades allowed only during market hours: ${String(config.openTime.hour).padStart(2, '0')}:${String(config.openTime.minute).padStart(2, '0')} - ${String(config.closeTime.hour).padStart(2, '0')}:${String(config.closeTime.minute).padStart(2, '0')}`);
                          return;
                        }
                        
                        setEntryTime(selectedTime);
                        
                        // ✅ Validate exit is still after entry
                        if (exitDate && exitTime) {
                          const validation = isExitAfterEntry(entryDate, selectedTime, exitDate, exitTime);
                          if (!validation.valid) {
                            alert(validation.message);
                            setExitTime('');
                          }
                        }
                      }}
                      step="60"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 Market Hours: {marketInfo?.name} ({String(marketInfo?.openTime.hour).padStart(2, '0')}:{String(marketInfo?.openTime.minute).padStart(2, '0')} - {String(marketInfo?.closeTime.hour).padStart(2, '0')}:{String(marketInfo?.closeTime.minute).padStart(2, '0')})
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🕐 Exit Date & Time (Optional)
                  </label>
                  <div className="space-y-2">
                    <input
                      type="date"
                      value={exitDate}
                      onChange={(e) => {
                        const selectedDate = e.target.value;
                        
                        // ✅ Block if before entry date
                        if (entryDate && selectedDate < entryDate) {
                          alert('❌ Exit date cannot be before entry date!');
                          return;
                        }
                        
                        // ✅ Validate market day
                        if (!isMarketDay(selectedDate) && formData.asset_type !== 'crypto') {
                          alert('❌ Weekend trades not allowed! Select Monday-Friday only.');
                          return;
                        }
                        
                        setExitDate(selectedDate);
                      }}
                      max={maxDateTime}
                      min={entryDate}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="time"
                      value={exitTime}
                      onChange={(e) => {
                        const selectedTime = e.target.value;
                        
                        if (!exitDate) {
                          alert('⚠️ Please select exit date first!');
                          return;
                        }
                        
                        // ✅ Validate market hours
                        if (!isWithinMarketHours(selectedTime, formData.asset_type)) {
                          const config = MARKET_HOURS[formData.asset_type as keyof typeof MARKET_HOURS];
                          alert(`❌ Trades allowed only during market hours: ${String(config.openTime.hour).padStart(2, '0')}:${String(config.openTime.minute).padStart(2, '0')} - ${String(config.closeTime.hour).padStart(2, '0')}:${String(config.closeTime.minute).padStart(2, '0')}`);
                          return;
                        }
                        
                        // ✅ CRITICAL: Validate exit is AFTER entry
                        const validation = isExitAfterEntry(entryDate, entryTime, exitDate, selectedTime);
                        if (!validation.valid) {
                          alert(validation.message + '\n\nEntry: ' + entryDate + ' at ' + entryTime + '\nExit: ' + exitDate + ' at ' + selectedTime);
                          return;
                        }
                        
                        setExitTime(selectedTime);
                      }}
                      step="60"
                      min={entryDate === exitDate ? entryTime : undefined}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 Must be AFTER entry time ({entryDate && entryTime ? `${entryDate} ${entryTime}` : 'N/A'})
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div 
            className="flex items-center justify-between cursor-pointer mb-4"
            onClick={() => toggleSection('notes')}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">📝</span>
              <h3 className="font-semibold text-gray-800">Trade Notes</h3>
            </div>
            <span className="text-gray-500">
              {collapsedSections.has('notes') ? '▼' : '▲'}
            </span>
          </div>

          {!collapsedSections.has('notes') && (
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              rows={4}
              placeholder="Why did you take this trade? What was your analysis?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>

        {/* Screenshot Upload */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div 
            className="flex items-center justify-between cursor-pointer mb-4"
            onClick={() => toggleSection('screenshot')}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">📸</span>
              <h3 className="font-semibold text-gray-800">Trade Screenshot</h3>
            </div>
            <span className="text-gray-500">
              {collapsedSections.has('screenshot') ? '▼' : '▲'}
            </span>
          </div>

          {!collapsedSections.has('screenshot') && (
            <div>
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 bg-gray-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
                
                {!screenshotUrl && !uploadingImage && (
                  <div>
                    <div className="text-6xl mb-4">📷</div>
                    <p className="text-gray-600 mb-4">
                      Drag & drop your screenshot here, or
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 font-medium"
                    >
                      Browse Files
                    </button>
                    <p className="text-xs text-gray-500 mt-2">
                      Max size: 5MB (JPG, PNG, GIF)
                    </p>
                  </div>
                )}

                {uploadingImage && (
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
                    <span className="text-blue-600 font-medium">Uploading...</span>
                  </div>
                )}

                {screenshotUrl && !uploadingImage && (
                  <div>
                    <p className="text-green-600 font-medium mb-3">
                      ✅ Screenshot uploaded!
                    </p>
                    <img
                      src={screenshotUrl}
                      alt="Trade screenshot"
                      className="max-w-full max-h-96 mx-auto rounded-lg border-2 border-green-200 mb-3"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setScreenshotUrl('');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-red-600 hover:text-red-700 font-medium"
                    >
                      Remove Screenshot
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading || uploadingImage}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg transition-all shadow-lg hover:shadow-xl"
          >
            {loading ? '💾 Saving Trade...' : '✅ Add Trade'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/trades')}
            disabled={loading}
            className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
          >
            Cancel
          </button>
        </div>

        <div className="text-center text-sm text-gray-500 border-t pt-4">
          💡 Press <kbd className="px-2 py-1 bg-gray-100 rounded">Esc</kbd> to cancel
        </div>
      </form>

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Save Trade Template</h3>
            <input
              type="text"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="Template name (e.g., 'My Breakout Setup')"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
              autoFocus
            />
            <p className="text-sm text-gray-600 mb-4">
              This will save: asset type, trade type, timeframe, setup type, stop loss, and target price.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={saveTemplate}
                className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 font-medium"
              >
                Save Template
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowTemplateModal(false);
                  setNewTemplateName('');
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}