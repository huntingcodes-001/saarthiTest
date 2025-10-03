import { useState, useEffect } from 'react';
import { Users, MessageSquare } from 'lucide-react';
import { Customer, ChatSession } from './types';
import { storageUtils } from './utils/storage';
import { db } from './utils/db';
import { CustomerList } from './components/CustomerList';
import { ChatInterface } from './components/ChatInterface';
import { ChatHistory } from './components/ChatHistory';
import { Login } from './components/Login';

function App() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeView, setActiveView] = useState<'customers' | 'history'>('customers');
  const [isAuthed, setIsAuthed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        const [dbCustomers, dbSessions] = await Promise.all([
          db.listCustomers(),
          db.listSessions(),
        ]);
        setCustomers(dbCustomers);
        setSessions(dbSessions);
      } catch (e) {
        // Fallback to local if DB not available
        const loadedCustomers = storageUtils.getCustomers();
        const loadedSessions = storageUtils.getSessions();
        setCustomers(loadedCustomers);
        setSessions(loadedSessions);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleAddCustomer = async (customerData: Omit<Customer, 'id' | 'createdAt'>) => {
    const newCustomer: Customer = {
      id: `customer_${Date.now()}`,
      ...customerData,
      createdAt: new Date().toISOString(),
    };
    const updatedCustomers = [...customers, newCustomer];
    setCustomers(updatedCustomers);
    try {
      await db.insertCustomer(newCustomer);
    } catch (e) {
      // Persist locally as fallback
      storageUtils.saveCustomers(updatedCustomers);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (confirm('Are you sure you want to delete this customer? All their chat sessions will also be deleted.')) {
      const updatedCustomers = customers.filter(c => c.id !== id);
      setCustomers(updatedCustomers);
      try {
        await db.deleteCustomer(id);
        await db.deleteSessionsByCustomer(id);
      } catch (e) {
        storageUtils.saveCustomers(updatedCustomers);
      }

      const updatedSessions = sessions.filter(s => s.customerId !== id);
      setSessions(updatedSessions);
      try {
        // Already deleted in DB; keep local in sync
        storageUtils.saveSessions(updatedSessions);
      } catch {}

      updatedSessions.forEach(session => {
        if (session.customerId === id) {
          storageUtils.deleteAudioBlob(session.id);
        }
      });
    }
  };

  const handleStartChat = (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  const handleSessionComplete = async (session: ChatSession) => {
    const updatedSessions = [...sessions, session];
    setSessions(updatedSessions);
    try {
      await db.insertSession(session);
      // keep a local copy for offline audio retrieval
      storageUtils.saveSessions(updatedSessions);
    } catch (e) {
      storageUtils.saveSessions(updatedSessions);
    }

    if (session.audioBlob) {
      await storageUtils.saveAudioBlob(session.id, session.audioBlob);
    }
  };

  const handleCloseChat = () => {
    setSelectedCustomer(null);
  };

  if (!isAuthed) {
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100">
          <div className="text-gray-700">Loading...</div>
        </div>
      );
    }
    return <Login onLoginSuccess={() => setIsAuthed(true)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Relationship Manager Portal</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage customer relationships and communications</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => setActiveView('customers')}
                className={`flex-1 sm:flex-initial justify-center flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  activeView === 'customers'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Users className="w-4 h-4" />
                Customers
              </button>
              <button
                onClick={() => setActiveView('history')}
                className={`flex-1 sm:flex-initial justify-center flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  activeView === 'history'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Chat History
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 gap-6">
          {activeView === 'customers' && (
            <CustomerList
              customers={customers}
              onAddCustomer={handleAddCustomer}
              onDeleteCustomer={handleDeleteCustomer}
              onStartChat={handleStartChat}
            />
          )}

          {activeView === 'history' && <ChatHistory sessions={sessions} />}
        </div>
      </main>

      {selectedCustomer && (
        <ChatInterface
          customer={selectedCustomer}
          onClose={handleCloseChat}
          onSessionComplete={handleSessionComplete}
        />
      )}
    </div>
  );
}

export default App;
