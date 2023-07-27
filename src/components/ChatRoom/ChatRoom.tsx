import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:5000', { transports: ['websocket'], upgrade: false });

interface Message {
  sender: string;
  content: string;
  timestamp: string;
  currentUserSent?: boolean;
}

const formatTimestamp = (timestamp: string): string => {
  const date: Date = new Date(timestamp);
  let hours: string = String(date.getUTCHours()).padStart(2, '0');
  let minutes: string = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const ChatRoom: React.FC = () => {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [rateLimitExceeded, setRateLimitExceeded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const timeFrame = 60 * 1000;
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
    console.log('Listening for messages...');
    socket.on('message', (data: Message) => {
      console.log('Received message:', data);
      setMessages((prevMessages) => (prevMessages ? [...prevMessages, { ...data, currentUserSent: false }] : [{ ...data, currentUserSent: false }]));
    });

    socket.on('history', (data: Message[]) => {
      console.log('Received history:', data);
      setMessages(data.map((msg) => ({ ...msg, timestamp: formatTimestamp(msg.timestamp), currentUserSent: false })));
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    socket.on('rateLimitExceeded', (message) => {
      console.log(message);
      setRateLimitExceeded(true);
      setTimeout(() => setRateLimitExceeded(false), timeFrame);
    });
    return () => {
      // Before the component unmounts, disconnect the socket
      socket.off('message');
      socket.off('history');
      socket.off('connect_error');
      socket.emit('requestHistory');
    };
  }, []);

  useEffect(() => {
    scrollToBottom(); // Scroll to bottom whenever new messages are added
  }, [messages]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const handleMessageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(event.target.value);
  };

  const sendMessage = () => {
    if (!name || !message || messageCount >= 15) return;
    const data: Message = {
      sender: name,
      content: message,
      timestamp: new Date().toISOString(),
      currentUserSent: true,
    };
    const dataToEmit: Message = {
      sender: name,
      content: message,
      timestamp: new Date().toISOString(),
    };
    socket.emit('message', dataToEmit);
    setMessages((prevMessages) => (prevMessages ? [...prevMessages, data] : [data]));
    setMessage('');
    setMessageCount(messageCount + 1);
    if (messageCount === 14) {
      setRateLimitExceeded(true);
      setTimeout(() => {
        setMessageCount(0);
        setRateLimitExceeded(false);
      }, timeFrame);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div className="w-full min-h-screen bg-white flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1080px] w-full space-y-6">
        <h1 className="md:text-7xl sm:text-3xl xs:text-lg mt-4 font-pp font-bold text-center mb-6">Chat Room</h1>
        <div className="rounded-lg bg-none border-2 border-black shadow-lg p-4 ">
          <div className="overflow-y-auto max-h-80">
            {messages ? (
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={`mb-2 ${msg.currentUserSent ? 'flex justify-end mr-4' : 'flex justify-start ml-4'}`}
                  ref={index === messages.length - 1 ? messagesEndRef : null}
                >
                  <div className="flex flex-col">
                    <div className={`mb-2 ${msg.currentUserSent ? 'flex justify-end' : 'flex justify-start'}`}>
                      <label className="text-sm font-medium">
                        {msg.sender} <span className="text-xs font-thin">{formatTimestamp(msg.timestamp)}</span>
                      </label>
                    </div>
                    <div
                      className={`rounded-lg text-md p-2 max-w-md ${
                        msg.currentUserSent ? 'bg-white text-black shadow-lg' : 'bg-black text-white shadow-xl'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div>Loading history...</div>
            )}
          </div>
        </div>
        <div className="flex flex-col space-y-2">
          <label htmlFor="name" className="font-semibold text-gray-700">
            Your Name
          </label>
          <input
            id="name"
            type="text"
            placeholder="Enter your Name"
            value={name}
            onChange={handleNameChange}
            className="flex-1 w-64 rounded-lg py-2 px-4 bg-white text-gray-700 focus:outline-black"
          />
          <label htmlFor="message" className="font-semibold text-gray-700">
            Message
          </label>
          <input
            id="message"
            type="text"
            placeholder="Type your message here"
            value={message}
            onChange={handleMessageChange}
            onKeyPress={handleKeyPress}
            className="flex-1 rounded-lg py-2 px-4 bg-white text-gray-700 focus:outline-black"
          />
          <div className="flex justify-end ">
            <button
              onClick={sendMessage}
              disabled={rateLimitExceeded}
              className=" w-24 px-2 py-2 bg-white border-2 border-black text-black shadow-2xl mb-6 hover:bg-black hover:text-white font-semibold rounded-lg focus:outline-none"
            >
              Send
            </button>
          </div>
        </div>
        {rateLimitExceeded && (
          <div className="text-red-600 text-sm">
            Rate limit exceeded. Please wait a moment before sending another message.
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatRoom;
