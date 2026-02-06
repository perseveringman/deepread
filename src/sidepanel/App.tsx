import React from 'react';

function App() {
  return (
    <div className="w-full h-full min-h-screen bg-gray-50 p-4">
      <header className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">DeepRead</h1>
        <p className="text-sm text-gray-500">AI-powered reading assistant</p>
      </header>
      
      <main>
        <div className="card p-4">
          <p className="text-gray-600">
            Open an article to get started.
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;
