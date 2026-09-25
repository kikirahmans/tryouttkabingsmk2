/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Student } from './data/studentsData';
import { ExamSubmissionPayload } from './services/googleSheetsService';
import { LoginScreen } from './components/LoginScreen';
import { ExamScreen } from './components/ExamScreen';
import { ResultScreen } from './components/ResultScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { AppsScriptModal } from './components/AppsScriptModal';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'login' | 'exam' | 'result' | 'admin'>('login');
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [activeDeviceInfo, setActiveDeviceInfo] = useState<any>(null);
  const [submissionResult, setSubmissionResult] = useState<ExamSubmissionPayload | null>(null);
  const [isAppsScriptModalOpen, setIsAppsScriptModalOpen] = useState<boolean>(false);

  const handleStartExam = (student: Student, deviceInfo: any) => {
    setActiveStudent(student);
    setActiveDeviceInfo(deviceInfo);
    setCurrentScreen('exam');
  };

  const handleFinishExam = (result: ExamSubmissionPayload) => {
    setSubmissionResult(result);
    setCurrentScreen('result');
  };

  const handleBackToHome = () => {
    setActiveStudent(null);
    setSubmissionResult(null);
    setCurrentScreen('login');
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans antialiased text-slate-800">
      {currentScreen === 'login' && (
        <LoginScreen
          onStartExam={handleStartExam}
          onOpenAdmin={() => setCurrentScreen('admin')}
        />
      )}

      {currentScreen === 'exam' && activeStudent && (
        <ExamScreen
          student={activeStudent}
          deviceInfo={activeDeviceInfo}
          onFinishExam={handleFinishExam}
        />
      )}

      {currentScreen === 'result' && submissionResult && (
        <ResultScreen
          result={submissionResult}
          onBackToHome={handleBackToHome}
        />
      )}

      {currentScreen === 'admin' && (
        <AdminDashboard
          onBackToHome={() => setCurrentScreen('login')}
          onOpenAppsScript={() => setIsAppsScriptModalOpen(true)}
        />
      )}

      {/* Global Google Apps Script & GitHub Setup Modal */}
      <AppsScriptModal
        isOpen={isAppsScriptModalOpen}
        onClose={() => setIsAppsScriptModalOpen(false)}
      />
    </div>
  );
}
