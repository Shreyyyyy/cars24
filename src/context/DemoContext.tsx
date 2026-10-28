'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { CustomerSession, SupportedLanguage, TestRideBooking, CallbackRequest, DemoActivityItem, Vehicle } from '@/types';
import { VEHICLES } from '@/data/vehicles';
import { DEMO_CONFIG, logDemoAction } from '@/lib/demo-mode';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning';
  title: string;
  message: string;
}

interface DemoContextType {
  // Session State
  session: CustomerSession;
  updateSession: (partial: Partial<CustomerSession>) => void;
  resetSession: () => void;
  setLanguage: (lang: SupportedLanguage) => void;

  // Bookings & Callbacks
  testRides: TestRideBooking[];
  addTestRide: (booking: Omit<TestRideBooking, 'id' | 'createdAt'>) => TestRideBooking;
  callbacks: CallbackRequest[];
  addCallback: (cb: Omit<CallbackRequest, 'id' | 'createdAt'>) => CallbackRequest;

  // Activity Log
  activityLog: DemoActivityItem[];
  clearActivityLog: () => void;
  resetAllDemoData: () => void;

  // Comparison State
  comparisonCarIds: string[];
  addToComparison: (vehicleId: string) => void;
  removeFromComparison: (vehicleId: string) => void;
  clearComparison: () => void;

  // Global Modals
  activeModal: string | null;
  modalPayload: any;
  openModal: (modalName: string, payload?: any) => void;
  closeModal: () => void;

  // Toasts
  toasts: ToastMessage[];
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;

  // Vehicle Detail Drawer/Modal
  selectedVehicle: Vehicle | null;
  openVehicleDetail: (vehicle: Vehicle) => void;
  closeVehicleDetail: () => void;

  // Settings
  simulatedDelay: boolean;
  toggleSimulatedDelay: () => void;
  showInsightPanel: boolean;
  toggleInsightPanel: () => void;
  selectedCity: string;
  setSelectedCity: (city: string) => void;
}

const DEFAULT_SESSION: CustomerSession = {
  sessionId: 'SESS-MSIL-7824',
  language: 'en',
  name: 'Demo Visitor',
  locationCity: 'Ahmedabad',
  locationState: 'Gujarat',
  budgetMinLakh: 7.0,
  budgetMaxLakh: 14.0,
  preferredCategory: 'SUV',
  preferredModel: 'Brezza',
  preferredFuel: 'Petrol',
  purchaseTimeline: 'Next Month',
  detectedIntent: 'Exploring Cars',
  estimatedSentiment: 'Interested',
  testRideInterest: false,
  callbackInterest: false,
  conversationStage: 'Discovery'
};

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<CustomerSession>(DEFAULT_SESSION);
  const [testRides, setTestRides] = useState<TestRideBooking[]>([]);
  const [callbacks, setCallbacks] = useState<CallbackRequest[]>([]);
  const [activityLog, setActivityLog] = useState<DemoActivityItem[]>([]);
  const [comparisonCarIds, setComparisonCarIds] = useState<string[]>(['swift-2024', 'baleno']);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [modalPayload, setModalPayload] = useState<any>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [simulatedDelay, setSimulatedDelay] = useState<boolean>(true);
  const [showInsightPanel, setShowInsightPanel] = useState<boolean>(true);
  const [selectedCity, setSelectedCity] = useState<string>('Ahmedabad');

  // Load from LocalStorage
  useEffect(() => {
    try {
      const storedTestRides = localStorage.getItem('maruti_test_rides');
      if (storedTestRides) setTestRides(JSON.parse(storedTestRides));

      const storedCallbacks = localStorage.getItem('maruti_callbacks');
      if (storedCallbacks) setCallbacks(JSON.parse(storedCallbacks));

      const storedLog = localStorage.getItem('maruti_demo_activity');
      if (storedLog) setActivityLog(JSON.parse(storedLog));
    } catch (e) {
      console.error('Error loading stored demo state', e);
    }
  }, []);

  const showToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = 'toast-' + Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const updateSession = (partial: Partial<CustomerSession>) => {
    setSession(prev => ({ ...prev, ...partial }));
  };

  const setLanguage = (lang: SupportedLanguage) => {
    setSession(prev => ({ ...prev, language: lang }));
    showToast({
      type: 'info',
      title: 'Language Updated',
      message: `Showroom assistant language switched to ${
        lang === 'hi' ? 'Hindi (Roman)' : lang === 'gu' ? 'Gujarati (Roman)' : lang === 'mr' ? 'Marathi (Roman)' : 'English'
      }`
    });
  };

  const resetSession = () => {
    const newSessionId = 'SESS-MSIL-' + Math.floor(1000 + Math.random() * 9000);
    setSession({
      ...DEFAULT_SESSION,
      sessionId: newSessionId
    });
    logDemoAction('RESET', 'Customer Session Reset', { sessionId: newSessionId });
    showToast({
      type: 'info',
      title: 'Session Cleared',
      message: `Started fresh session ${newSessionId}. Chat insights reset.`
    });
  };

  const addTestRide = (booking: Omit<TestRideBooking, 'id' | 'createdAt'>): TestRideBooking => {
    const newBooking: TestRideBooking = {
      ...booking,
      id: 'TR-' + Date.now().toString(36).toUpperCase(),
      createdAt: new Date().toLocaleString('en-IN')
    };
    const updated = [newBooking, ...testRides];
    setTestRides(updated);
    localStorage.setItem('maruti_test_rides', JSON.stringify(updated));

    // Update customer session
    updateSession({
      testRideInterest: true,
      preferredModel: booking.vehicleName,
      conversationStage: 'Action Initiation'
    });

    logDemoAction('TEST_RIDE', `Simulated Test Ride: ${booking.vehicleName}`, {
      ref: booking.bookingRef,
      showroom: booking.showroomName,
      city: booking.city
    });

    showToast({
      type: 'success',
      title: 'Demo Test Ride Simulated',
      message: `Booking Ref: ${booking.bookingRef} for ${booking.vehicleName}. No real appointment created.`
    });

    return newBooking;
  };

  const addCallback = (cb: Omit<CallbackRequest, 'id' | 'createdAt'>): CallbackRequest => {
    const newCb: CallbackRequest = {
      ...cb,
      id: 'CB-' + Date.now().toString(36).toUpperCase(),
      createdAt: new Date().toLocaleString('en-IN')
    };
    const updated = [newCb, ...callbacks];
    setCallbacks(updated);
    localStorage.setItem('maruti_callbacks', JSON.stringify(updated));

    updateSession({
      callbackInterest: true
    });

    logDemoAction('CALLBACK', `Simulated Callback: ${cb.reason}`, {
      ref: cb.callbackRef,
      city: cb.city
    });

    showToast({
      type: 'success',
      title: 'Demo Callback Request Created',
      message: `Reference ${cb.callbackRef}. Marked as simulated demo.`
    });

    return newCb;
  };

  const addToComparison = (vehicleId: string) => {
    if (comparisonCarIds.includes(vehicleId)) return;
    if (comparisonCarIds.length >= 3) {
      showToast({
        type: 'warning',
        title: 'Comparison Limit Reached',
        message: 'You can compare up to 3 cars side-by-side. Please remove one to add another.'
      });
      return;
    }
    const updated = [...comparisonCarIds, vehicleId];
    setComparisonCarIds(updated);
    const v = VEHICLES.find(x => x.id === vehicleId);
    showToast({
      type: 'info',
      title: 'Added to Comparison',
      message: `${v?.name || 'Vehicle'} added to comparison drawer.`
    });
  };

  const removeFromComparison = (vehicleId: string) => {
    setComparisonCarIds(prev => prev.filter(id => id !== vehicleId));
  };

  const clearComparison = () => {
    setComparisonCarIds([]);
  };

  const openModal = (modalName: string, payload?: any) => {
    setActiveModal(modalName);
    setModalPayload(payload || null);
  };

  const closeModal = () => {
    setActiveModal(null);
    setModalPayload(null);
  };

  const openVehicleDetail = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    openModal('vehicle_details', vehicle);
  };

  const closeVehicleDetail = () => {
    setSelectedVehicle(null);
    if (activeModal === 'vehicle_details') {
      closeModal();
    }
  };

  const clearActivityLog = () => {
    setActivityLog([]);
    localStorage.removeItem('maruti_demo_activity');
    showToast({
      type: 'info',
      title: 'Activity Log Cleared',
      message: 'Demo transaction history has been cleared.'
    });
  };

  const resetAllDemoData = () => {
    localStorage.removeItem('maruti_test_rides');
    localStorage.removeItem('maruti_callbacks');
    localStorage.removeItem('maruti_demo_activity');
    setTestRides([]);
    setCallbacks([]);
    setActivityLog([]);
    resetSession();
    showToast({
      type: 'info',
      title: 'All Demo State Reset',
      message: 'All local simulated bookings, callbacks, and activity feeds have been cleared.'
    });
  };

  return (
    <DemoContext.Provider
      value={{
        session,
        updateSession,
        resetSession,
        setLanguage,
        testRides,
        addTestRide,
        callbacks,
        addCallback,
        activityLog,
        clearActivityLog,
        resetAllDemoData,
        comparisonCarIds,
        addToComparison,
        removeFromComparison,
        clearComparison,
        activeModal,
        modalPayload,
        openModal,
        closeModal,
        toasts,
        showToast,
        removeToast,
        selectedVehicle,
        openVehicleDetail,
        closeVehicleDetail,
        simulatedDelay,
        toggleSimulatedDelay: () => setSimulatedDelay(prev => !prev),
        showInsightPanel,
        toggleInsightPanel: () => setShowInsightPanel(prev => !prev),
        selectedCity,
        setSelectedCity
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

export function useDemoContext() {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemoContext must be used within a DemoProvider');
  }
  return context;
}
