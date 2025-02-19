import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Trash, Globe, Link, Copy, Edit } from "lucide-react";

const NotesManager = () => {
  const [globalNotes, setGlobalNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [isGlobal, setIsGlobal] = useState(true);
  const [currentURL, setCurrentURL] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  // Function to update Chrome storage and local state
  const updateStorage = (updatedNotes) => {
    chrome.storage.local.set({ globalNotes: updatedNotes }, () => {
      setGlobalNotes(updatedNotes);
    });
  };

  // Fetch current tab hostname initially
  const updateCurrentURL = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url) {
        try {
          const hostname = new URL(tabs[0].url).hostname;
          setCurrentURL(hostname);
        } catch (err) {
          console.error("Error parsing URL:", err);
          setCurrentURL("");
        }
      }
    });
  };

  useEffect(() => {
    updateCurrentURL();
    // Listen to tab activation changes
    const handleTabActivated = (activeInfo) => {
      chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (tab && tab.url) {
          try {
            const hostname = new URL(tab.url).hostname;
            setCurrentURL(hostname);
          } catch (err) {
            console.error("Error parsing URL:", err);
            setCurrentURL("");
          }
        }
      });
    };

    const handleTabUpdated = (tabId, changeInfo, tab) => {
      if (tab.active && changeInfo.url) {
        try {
          const hostname = new URL(changeInfo.url).hostname;
          setCurrentURL(hostname);
        } catch (err) {
          console.error("Error parsing updated URL:", err);
          setCurrentURL("");
        }
      }
    };

    chrome.tabs.onActivated.addListener(handleTabActivated);
    chrome.tabs.onUpdated.addListener(handleTabUpdated);

    // Cleanup listeners on unmount
    return () => {
      chrome.tabs.onActivated.removeListener(handleTabActivated);
      chrome.tabs.onUpdated.removeListener(handleTabUpdated);
    };
  }, []);

  // Load notes from storage and listen for external changes
  useEffect(() => {
    chrome.storage.local.get("globalNotes", (result) => {
      setGlobalNotes(result.globalNotes || []);
    });

    const storageChangeListener = (changes) => {
      if (changes.globalNotes && changes.globalNotes.newValue) {
        setGlobalNotes(changes.globalNotes.newValue);
      }
    };
    chrome.storage.onChanged.addListener(storageChangeListener);

    return () => {
      chrome.storage.onChanged.removeListener(storageChangeListener);
    };
  }, []);

  // Derived notes list: global shows all, local filters by current hostname
  const displayedNotes = useMemo(() => {
    return isGlobal
      ? globalNotes
      : globalNotes.filter((note) => note.url === currentURL);
  }, [globalNotes, isGlobal, currentURL]);

  // Add a new note (always stored globally with current tab hostname)
  const addNote = () => {
    if (newNote.trim() === "") return;
    const note = {
      id: Date.now(), // simple unique id
      text: newNote,
      url: currentURL, // storing the hostname where note was created
    };
    const updatedNotes = [...globalNotes, note];
    updateStorage(updatedNotes);
    setNewNote("");
  };

  // Delete a note
  const deleteNote = (id) => {
    const updatedNotes = globalNotes.filter((note) => note.id !== id);
    updateStorage(updatedNotes);
  };

  // Start editing a note
  const startEditNote = (id, text) => {
    setEditingId(id);
    setEditText(text);
  };

  // Save an edited note
  const saveEditNote = (id) => {
    const updatedNotes = globalNotes.map((note) =>
      note.id === id ? { ...note, text: editText } : note
    );
    updateStorage(updatedNotes);
    setEditingId(null);
  };

  // Copy note text to clipboard
  const copyNote = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.2 }}
      className="p-4 bg-white rounded-2xl"
    >
      {/* Heading */}
      <h2 className="text-xl font-bold text-[#E04A2F] mb-4">Smart Notes</h2>

      {/* Global / Local Toggle */}
      <div className="flex justify-between items-center mb-4 p-2 bg-gray-100 rounded-lg">
        <button
          className={`flex items-center gap-2 px-3 py-1 rounded-lg font-medium transition-all ${
            isGlobal
              ? "bg-[#E04A2F] text-white"
              : "bg-gray-300 text-gray-700 hover:bg-gray-400"
          }`}
          onClick={() => setIsGlobal(true)}
        >
          <Globe size={16} /> Global Notes
        </button>
        <button
          className={`flex items-center gap-2 px-3 py-1 rounded-lg font-medium transition-all ${
            !isGlobal
              ? "bg-[#E04A2F] text-white"
              : "bg-gray-300 text-gray-700 hover:bg-gray-400"
          }`}
          onClick={() => setIsGlobal(false)}
        >
          <Link size={16} /> Local Notes
        </button>
      </div>

      {/* Add Note Input (only in Global mode) */}
      {isGlobal && (
        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Enter a note..."
            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#E04A2F] focus:ring-[#E04A2F]"
            onKeyDown={(e) => e.key === "Enter" && addNote()}
          />
          <button
            onClick={addNote}
            className="bg-[#E04A2F] text-white px-4 py-2 rounded-lg hover:bg-[#C13C25] transition-all"
          >
            Add
          </button>
        </div>
      )}

      {/* Notes List */}
      <ul className="max-h-40 overflow-y-auto">
        {displayedNotes.map((note) => (
          <li
            key={note.id}
            className="flex justify-between items-center p-2 border-b border-gray-200"
          >
            <div className="flex items-center gap-2">
              {isGlobal ? (
                <Globe size={16} className="text-gray-500" />
              ) : (
                <Link size={16} className="text-gray-500" />
              )}
              {editingId === note.id ? (
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveEditNote(note.id)}
                  className="w-full bg-transparent border-none text-sm focus:outline-none"
                />
              ) : (
                <span className="text-sm">{note.text}</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => copyNote(note.text)}
                className="text-blue-500 hover:text-blue-700"
              >
                <Copy size={16} />
              </button>
              {editingId === note.id ? (
                <button
                  onClick={() => saveEditNote(note.id)}
                  className="text-green-500 hover:text-green-700"
                >
                  Save
                </button>
              ) : (
                <button
                  onClick={() => startEditNote(note.id, note.text)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <Edit size={16} />
                </button>
              )}
              <button
                onClick={() => deleteNote(note.id)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </motion.div>
  );
};

export default NotesManager;
