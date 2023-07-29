import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:5000', { transports: ['websocket'], upgrade: false });

interface Message {
  sender: string;
  content: string;
  timestamp: string;
  currentUserSent?: boolean;
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  
  // Add suffix to day of the month
  const suffix = ["th", "st", "nd", "rd"],
        i = date.getDate() % 100;
  
  const day = date.getDate() + (suffix[(i - 20) % 10] || suffix[i] || suffix[0]);

  // Get month name and full year
  const month = date.toLocaleString('default', { month: 'long' });
  const year = date.getFullYear();

  // Get hours and minutes. If minutes is a single digit, prepend it with '0'
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${day} ${month} ${year} ${hours}:${minutes}`;
}

const ChatRoom: React.FC = () => {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [rateLimitExceeded, setRateLimitExceeded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const timeFrame = 60 * 1000;
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
    socket.on('message', (data: Message) => {
      if(data.sender !== name) {
        setMessages((prevMessages) => prevMessages ? [...prevMessages, { ...data, currentUserSent: false }] : [{ ...data, currentUserSent: false }]);
      }
    });

    socket.on('history', (data: Message[]) => {
      setMessages(data.map((msg) => ({ ...msg, timestamp: msg.timestamp, currentUserSent: msg.sender === name })));
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
      socket.off('message');
      socket.off('history');
      socket.off('connect_error');
      socket.emit('requestHistory');
    };
  }, [name]);

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
      timestamp: formatTimestamp(new Date().toISOString()),
      currentUserSent: true,
    };
    socket.emit('message', data);
    setMessages((prevMessages) => prevMessages ? [...prevMessages, data] : [data]);
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
    <div className="w-full min-h-screen bg-doodle flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className='w-full h-full bg-white bg-opacity-90 flex items-center justify-center rounded-xl '>
      <div className="max-w-[1080px] w-full space-y-6">
        <h1 className="md:text-7xl sm:text-3xl xs:text-lg mt-4 font-pp font-bold text-center mb-6">Chat Room</h1>
        <div className="rounded-lg bg-white bg-opacity-80 shadow-2xl p-4 ">
          <div className="overflow-y-auto max-h-80 ">
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
                        {msg.sender} <span className="text-xs font-thin">{msg.timestamp}</span>
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
          <label htmlFor="name" className="font-semibold text-black">
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
          <label htmlFor="message" className="font-semibold text-black">
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
              className=" w-24 px-2 py-2 bg-white border-2 border-black text-black shadow-2xl mb-2 hover:bg-black hover:text-white font-semibold rounded-lg focus:outline-none"
            >
              Send
            </button>
          </div>
        </div>
        {rateLimitExceeded && (
          <div className="text-red-600 text-3xl pb-4">
            Rate limit exceeded. Please wait a moment before sending another message.
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default ChatRoom;
