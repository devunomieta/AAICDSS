import React, { useState } from 'react';
import { CheckCircle } from 'lucide-react';

const SUS_QUESTIONS = [
  "I think that I would like to use this system frequently.",
  "I found the system unnecessarily complex.",
  "I thought the system was easy to use.",
  "I think that I would need the support of a technical person to be able to use this system.",
  "I found the various functions in this system were well integrated.",
  "I thought there was too much inconsistency in this system.",
  "I would imagine that most people would learn to use this system very quickly.",
  "I found the system very cumbersome to use.",
  "I felt very confident using the system.",
  "I needed to learn a lot of things before I could get going with this system."
];

export function SUS_Survey() {
  const [responses, setResponses] = useState<number[]>(Array(10).fill(0));
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  const handleSelect = (qIndex: number, value: number) => {
    const newResponses = [...responses];
    newResponses[qIndex] = value;
    setResponses(newResponses);
  };

  const calculateSUS = () => {
    if (responses.includes(0)) {
      alert("Please answer all questions before submitting.");
      return;
    }
    
    let sum = 0;
    responses.forEach((resp, i) => {
      // odd questions (index 0, 2, 4...) -> score is resp - 1
      if (i % 2 === 0) {
        sum += (resp - 1);
      } 
      // even questions (index 1, 3, 5...) -> score is 5 - resp
      else {
        sum += (5 - resp);
      }
    });
    
    const finalScore = sum * 2.5;
    setScore(finalScore);
    setSubmitted(true);
  };

  if (submitted && score !== null) {
    return (
      <div className="bg-surface border border-border rounded-xl p-8 text-center">
        <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Survey Submitted</h2>
        <p className="text-gray-400 mb-6">Thank you for your feedback.</p>
        <div className="inline-block bg-background border border-border p-6 rounded-lg">
          <p className="text-sm text-textMuted uppercase tracking-wider mb-2">System Usability Scale Score</p>
          <p className="text-5xl font-bold text-primary">{score.toFixed(1)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-6">
      <h2 className="text-xl font-bold text-white mb-2">System Usability Scale (SUS)</h2>
      <p className="text-textMuted mb-6">Please provide your feedback on the clinical usability of AffiongAI.</p>
      
      <div className="space-y-6 mb-8">
        {SUS_QUESTIONS.map((q, idx) => (
          <div key={idx} className="bg-background border border-border rounded-lg p-4">
            <p className="text-white font-medium mb-4">{idx + 1}. {q}</p>
            <div className="flex justify-between items-center max-w-2xl mx-auto gap-2">
              <span className="text-xs text-gray-500">Strongly Disagree</span>
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  onClick={() => handleSelect(idx, val)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center border transition-colors ${responses[idx] === val ? 'bg-primary border-primary text-white font-bold' : 'bg-surface border-border text-gray-400 hover:border-gray-500'}`}
                >
                  {val}
                </button>
              ))}
              <span className="text-xs text-gray-500">Strongly Agree</span>
            </div>
          </div>
        ))}
      </div>
      
      <button 
        onClick={calculateSUS}
        className="w-full py-3 bg-primary hover:bg-primaryHover text-white font-bold rounded-lg transition-colors"
      >
        Submit Assessment
      </button>
    </div>
  );
}
