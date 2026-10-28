'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  CarFront,
  Building2,
  GitCompareArrows,
  Wrench,
  ShieldCheck,
  PhoneCall,
  Share2,
  ChevronRight,
  RotateCcw,
  Volume2,
  Check,
  Loader2,
  Info
} from 'lucide-react';
import { useDemoContext } from '@/context/DemoContext';
import { ChatMessage, SupportedLanguage } from '@/types';
import { generateBotReply } from '@/data/mock-responses';
import { VehicleCardMini } from '@/components/chat/VehicleCardMini';
import { CustomerInsightPanel } from '@/components/chat/CustomerInsightPanel';
import { DemoActionBanner } from '@/components/layout/DemoActionBanner';

const DEFAULT_PROMPTS = [
  'Find a car under ₹10 lakh',
  'Compare SUVs',
  'Find a showroom near me',
  'Explore CNG cars',
  'Book a test ride',
  'Check service centres',
  'Explore insurance options'
];

export const ChatContainer: React.FC = () => {
  const {
    session,
    updateSession,
    resetSession,
    setLanguage,
    openModal,
    showToast,
    simulatedDelay
  } = useDemoContext();

  const [isInsightCollapsed, setIsInsightCollapsed] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize welcome message when language changes or first load
  useEffect(() => {
    const welcomeContent =
      session.language === 'hi'
        ? "Namaste! 👋 Maruti Suzuki AI Showroom Assistant mein aapka swagat hai. Main aapko cars explore karne, models compare karne, najdeeki showroom dhundhne aur demo test ride schedule karne mein madad kar sakta hoon. Aaj main aapki kya sahayata karoon?"
        : session.language === 'gu'
        ? "Namaste! 👋 Tamara Maruti Suzuki AI Showroom Assistant ma swagat chhe. Hu tamne navi cars jova, models compare karva, najik na showroom sodhava ane demo test ride arrange karva ma madat karish. Hu tamari shu madat kari shaku?"
        : session.language === 'mr'
        ? "Namaskar! 👋 Aaplya Maruti Suzuki AI Showroom Assistant madhe swagat ahe. Mi tumhala navin gaadya shodhane, models tulna karne, jawalil showroom shodhne aani demo test drive request karne yaat madat kareen. Mi tumhala kashi madat karu?"
        : "Namaste! 👋 Welcome to your AI Showroom Assistant. I'm here to help you explore cars, compare models, discover nearby showrooms and arrange a test ride. How can I help you today?";

    setMessages([
      {
        id: 'msg-welcome',
        sender: 'assistant',
        content: welcomeContent,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        suggestedPrompts: DEFAULT_PROMPTS,
        actions: [
          { label: 'Book Test Ride', actionType: 'book_test_ride' },
          { label: 'Find Showrooms', actionType: 'find_showroom' },
          { label: 'Compare Cars', actionType: 'compare_cars' }
        ]
      }
    ]);
  }, [session.language]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query) return;

    const userMessage: ChatMessage = {
      id: 'msg-user-' + Date.now(),
      sender: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    const delay = simulatedDelay ? 750 : 250;

    setTimeout(() => {
      const replyData = generateBotReply(query, session.language);

      // Update customer insight session telemetry
      updateSession({
        detectedIntent: replyData.detectedIntent,
        estimatedSentiment: replyData.estimatedSentiment,
        conversationStage: replyData.stageUpdate || session.conversationStage
      });

      const assistantMessage: ChatMessage = {
        id: 'msg-asst-' + Date.now(),
        sender: 'assistant',
        content: replyData.reply,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        suggestedPrompts: replyData.suggestedPrompts,
        vehicleRecommendations: replyData.recommendedVehicleIds,
        actions: replyData.actions
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, delay);
  };

  const handleActionClick = (actionType: string, payload?: any) => {
    switch (actionType) {
      case 'book_test_ride':
        openModal('test_ride', payload);
        break;
      case 'find_showroom':
        openModal('find_showroom', payload);
        break;
      case 'compare_cars':
        openModal('compare_cars', payload);
        break;
      case 'service_centre':
        openModal('service_centre', payload);
        break;
      case 'insurance':
        openModal('insurance', payload);
        break;
      case 'callback':
        openModal('callback', payload);
        break;
      case 'share_whatsapp':
        openModal('share_whatsapp', payload);
        break;
      case 'share_email':
        openModal('share_email', payload);
        break;
      default:
        break;
    }
  };

  return (
    <div className="flex h-[calc(100vh-8.5rem)] w-full overflow-hidden bg-gray-50/50">
      {/* Left Chat Conversation Column */}
      <div className="flex-1 flex flex-col justify-between h-full bg-white border-r border-gray-200">
        {/* Chat Sub-header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-600 text-white shadow-2xs">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-gray-900 leading-tight">
                Your AI Showroom Assistant
              </h2>
              <p className="text-[11px] text-gray-500">
                Find your perfect Maruti Suzuki • Interactive AI Demo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Online Assistant</span>
            </div>
            <button
              onClick={resetSession}
              title="Reset conversation"
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
          <DemoActionBanner
            variant="compact"
            customMessage="CONVERSATIONAL DEMO: Demonstrates natural intent detection and real-time customer profiling without external API keys."
          />

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} animate-in fade-in duration-200`}
            >
              <div className="flex items-start gap-2.5 max-w-[88%] sm:max-w-[78%]">
                {msg.sender === 'assistant' && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-xl bg-red-600 text-white flex items-center justify-center text-xs font-bold shadow-2xs mt-1">
                    MS
                  </div>
                )}

                <div className="space-y-2">
                  <div
                    className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-2xs ${
                      msg.sender === 'user'
                        ? 'bg-gray-900 text-white rounded-tr-xs'
                        : 'bg-gray-100/80 text-gray-900 rounded-tl-xs border border-gray-200/60'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.content}</p>
                    <div
                      className={`text-[10px] mt-1.5 ${
                        msg.sender === 'user' ? 'text-gray-400 text-right' : 'text-gray-400'
                      }`}
                    >
                      {msg.timestamp}
                    </div>
                  </div>

                  {/* Vehicle Recommendations inside chat */}
                  {msg.vehicleRecommendations && msg.vehicleRecommendations.length > 0 && (
                    <div className="pt-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 mb-2">
                        <Sparkles className="w-3.5 h-3.5 text-red-600" />
                        <span>Recommended Models</span>
                      </div>
                      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                        {msg.vehicleRecommendations.map(vid => (
                          <VehicleCardMini key={vid} vehicleId={vid} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Chips */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {msg.actions.map((act, i) => (
                        <button
                          key={i}
                          onClick={() => handleActionClick(act.actionType, act.payload)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white transition-all text-xs font-semibold shadow-2xs"
                        >
                          <CarFront className="w-3 h-3" />
                          <span>{act.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {msg.sender === 'user' && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-xl bg-gray-200 text-gray-700 flex items-center justify-center text-xs font-bold mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-center gap-2 text-xs text-gray-400 italic">
              <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-red-100 text-red-600 flex items-center justify-center text-[10px] font-bold">
                MS
              </div>
              <div className="flex items-center gap-1 p-2 rounded-xl bg-gray-100 text-gray-500">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce delay-100"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce delay-200"></span>
                <span className="ml-1 text-[11px] font-medium text-gray-500">Formulating recommendation...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts & Input Box */}
        <div className="p-4 border-t border-gray-100 bg-white space-y-3">
          {/* Prompt chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex-shrink-0 mr-1">
              Suggested:
            </span>
            {DEFAULT_PROMPTS.map((p, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(p)}
                className="whitespace-nowrap px-3 py-1.5 rounded-full bg-gray-100 hover:bg-red-50 hover:text-red-700 hover:border-red-200 border border-gray-200 text-gray-700 text-xs font-medium transition-all flex-shrink-0"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input field */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask about mileage, SUVs, budget, showrooms, or test ride (English, Hindi, Gujarati, Marathi)..."
              className="flex-1 rounded-xl border border-gray-300 p-3 text-xs sm:text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 bg-white"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim()}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-40 shadow-sm shadow-red-600/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Right Column: Customer Insight Panel */}
      <CustomerInsightPanel
        isCollapsed={isInsightCollapsed}
        onToggleCollapse={() => setIsInsightCollapsed(!isInsightCollapsed)}
      />
    </div>
  );
};
