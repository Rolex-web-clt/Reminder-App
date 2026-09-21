import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Mic,
  MicOff,
  X,
  Calendar,
  Clock,
  Tag,
  Repeat,
  Check,
  Edit3,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { api } from '../../services/api';
import { Reminder } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';

interface AiReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSchedule: (reminderData: Partial<Reminder>) => Promise<void>;
  onOpenEditModal: (prefill: Partial<Reminder>) => void;
}

export const AiReminderModal: React.FC<AiReminderModalProps> = ({
  isOpen,
  onClose,
  onConfirmSchedule,
  onOpenEditModal,
}) => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [promptText, setPromptText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedResult, setParsedResult] = useState<any | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check speech recognition support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setPromptText(transcript);
      };

      recognition.onerror = (err: any) => {
        console.warn('Speech recognition error:', err);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  if (!isOpen) return null;

  const toggleListening = () => {
    if (!speechSupported) {
      showToast('Speech recognition is not supported in this browser. Please type your prompt.', 'info');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setParsedResult(null);
      setIsListening(true);
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleParse = async () => {
    if (!promptText.trim()) return;
    setIsProcessing(true);
    try {
      const res = await api.parseReminderWithAI(promptText.trim());
      if (res.data?.parsed) {
        setParsedResult(res.data.parsed);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = async () => {
    if (!parsedResult) return;
    setIsProcessing(true);
    try {
      await onConfirmSchedule({
        title: parsedResult.title,
        description: parsedResult.description || '',
        date: parsedResult.date,
        time: parsedResult.time || '09:00',
        priority: parsedResult.priority || 'MEDIUM',
        category: parsedResult.category || 'Personal',
        tags: parsedResult.tags || [],
        recurrence: { type: parsedResult.recurrence || 'NONE' },
      });
      onClose();
      setParsedResult(null);
      setPromptText('');
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditBefore = () => {
    if (!parsedResult) return;
    onOpenEditModal({
      title: parsedResult.title,
      description: parsedResult.description || '',
      date: parsedResult.date,
      time: parsedResult.time || '09:00',
      priority: parsedResult.priority || 'MEDIUM',
      category: parsedResult.category || 'Personal',
      tags: parsedResult.tags || [],
      recurrence: { type: parsedResult.recurrence || 'NONE' },
    });
    onClose();
    setParsedResult(null);
    setPromptText('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden transition-all">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {t('ai_assistant')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Powered by Gemini 3.8 Flash & Speech API
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Input & Voice Controls */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Speak or Type in Natural Language
            </label>
            <div className="relative">
              <textarea
                rows={3}
                value={promptText}
                onChange={e => setPromptText(e.target.value)}
                placeholder="e.g. 'Remind me to call accountant tomorrow at 3 PM urgent for annual tax review' or 'Doctor appointment every Monday at 9 AM'"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none pr-14"
              />

              {/* Voice Record Button */}
              <button
                type="button"
                id="ai-voice-record-btn"
                onClick={toggleListening}
                className={`absolute right-3 bottom-3 p-2.5 rounded-xl transition ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30'
                    : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900'
                }`}
                title={isListening ? 'Stop listening' : 'Start voice input'}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>

            {isListening && (
              <p className="text-xs text-rose-500 font-medium flex items-center gap-1.5 mt-2 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Listening to speech... Speak clearly.
              </p>
            )}
          </div>

          {/* Quick Example Suggestions */}
          {!parsedResult && !isListening && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Try quick examples:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Team standup meeting tomorrow at 10 AM',
                  'Pay credit card bill next Friday at 7 PM urgent',
                  'Take blood pressure medicine every morning at 8 AM',
                ].map((sample, i) => (
                  <button
                    key={i}
                    onClick={() => setPromptText(sample)}
                    className="text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 px-2.5 py-1 rounded-lg transition text-left"
                  >
                    "{sample}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Process Button */}
          {!parsedResult && (
            <button
              id="ai-parse-btn"
              onClick={handleParse}
              disabled={!promptText.trim() || isProcessing}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition shadow-sm"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Extracting schedule details...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Parse & Preview Reminder</span>
                </>
              )}
            </button>
          )}

          {/* Structured Confirmation Screen */}
          {parsedResult && (
            <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  {t('ai_detect_title')}
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                  {parsedResult.priority}
                </span>
              </div>

              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  {parsedResult.title}
                </h4>
                {parsedResult.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    {parsedResult.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300 pt-2 border-t border-indigo-100 dark:border-indigo-900/40">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{parsedResult.date}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{parsedResult.time}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span>{parsedResult.category}</span>
                </div>
                {parsedResult.recurrence !== 'NONE' && (
                  <div className="flex items-center gap-1.5">
                    <Repeat className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Repeats {parsedResult.recurrence.toLowerCase()}</span>
                  </div>
                )}
              </div>

              {parsedResult.tags && parsedResult.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {parsedResult.tags.map((tg: string) => (
                    <span
                      key={tg}
                      className="text-[10px] font-medium bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700"
                    >
                      #{tg}
                    </span>
                  ))}
                </div>
              )}

              {/* Action buttons: Confirm vs Edit */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  id="ai-edit-details-btn"
                  onClick={handleEditBefore}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs border border-slate-200 dark:border-slate-700 transition"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{t('ai_edit_before')}</span>
                </button>

                <button
                  type="button"
                  id="ai-confirm-schedule-btn"
                  onClick={handleConfirm}
                  disabled={isProcessing}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{t('ai_confirm_create')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
