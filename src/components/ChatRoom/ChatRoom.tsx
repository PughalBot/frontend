import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:5000', { transports: ['websocket'], upgrade: false });

interface Message {
  sender: string;
  content: string;
  timestamp: string;
}

const ChatRoom: React.FC = () => {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [rateLimitExceeded, setRateLimitExceeded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const timeFrame = 60 * 1000;
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
    console.log('Listening for messages...');
    socket.on('message', (data: Message) => {
      console.log('Received message:', data);
      setMessages((prevMessages) => [...prevMessages, data]);
    });

    socket.on('history', (data: Message[]) => {
      console.log('Received history:', data);
      setMessages(data);
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
    };
    socket.emit('message', data);
    setMessages((prevMessages) => [...prevMessages, data]);
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
    <div className="w-full min-h-screen bg-gray-200 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1080px] w-full space-y-6">
        <div>
          <h1 className="text-3xl mt-4 font-lbb font-semibold text-center mb-6">Chat Room</h1>
          <div className="rounded-lg shadow-lg p-4 bg-white">
            <div className="overflow-y-auto max-h-80">
              {messages.map((msg, index) => (
                <div key={index} className="mb-2" ref={index === messages.length - 1 ? messagesEndRef : null}>
                  <div className='text-black'>
                    <strong>{msg.sender}</strong>: {msg.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col space-y-2 space-x-0">
          <input
            type="text"
            placeholder="Your Name"
            value={name}
            onChange={handleNameChange}
            className="flex-1 w-64 rounded-lg py-2 px-4 bg-white text-gray-700 focus:outline-none"
          />
          <input
            type="text"
            placeholder="Type your message here"
            value={message}
            onChange={handleMessageChange}
            onKeyPress={handleKeyPress}
            className="flex-1 appearance-none rounded-lg py-14 px-4 bg-white text-gray-700 focus:outline-none"
          />
          <div className='flex justify-end '>
          <button
            onClick={sendMessage}
            disabled={rateLimitExceeded}
            className=" w-24 px-2 py-2 bg-indigo-600 text-white font-semibold rounded-lg focus:outline-none"
          >
            Send
          </button>
          </div>
        </div>
        {rateLimitExceeded && (
          <div className="text-red-600 text-sm">Rate limit exceeded. Please wait a moment before sending another message.</div>
        )}
      </div>
    </div>
  );
};

export default ChatRoom;
