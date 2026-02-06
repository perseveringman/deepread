import React from 'react';

function App() {
  const openSidePanel = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.sidePanel.open({ tabId: tabs[0].id });
      }
    });
  };

  return (
    <div className="w-80 p-4 bg-white">
      <header className="mb-4">
        <h1 className="text-lg font-bold text-gray-900">DeepRead</h1>
      </header>
      
      <button
        onClick={openSidePanel}
        className="btn-primary w-full mb-3"
      >
        Open Side Panel
      </button>
      
      <div className="text-xs text-gray-500 text-center">
        Configure API key in Side Panel settings
      </div>
    </div>
  );
}

export default App;
