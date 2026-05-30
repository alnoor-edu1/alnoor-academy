import { useState, useEffect, useRef } from "react";

export default function Chat({ subjectId, subjectName, teacherName, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  // محاكاة لجلب الرسائل (سنربطها مع Firebase لاحقاً)
  useEffect(() => {
    setLoading(false);
  }, [subjectId]);

  // إرسال رسالة
  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    // مؤقتاً نضيف الرسالة محلياً
    setMessages([...messages, {
      id: Date.now(),
      userName: "أنت",
      message: newMessage,
      timestamp: new Date()
    }]);
    setNewMessage("");
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <button className="chat-back-btn" onClick={onClose}>✕</button>
        <div>
          <h3>💬 محادثة {subjectName}</h3>
          <p>مع: {teacherName || "المعلم"}</p>
        </div>
      </div>

      <div className="chat-messages">
        {loading ? (
          <div className="chat-loading">جاري التحميل...</div>
        ) : messages.length === 0 ? (
          <div className="chat-empty">
            <span>💬</span>
            <p>لا توجد رسائل بعد. كن أول من يرسل رسالة!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="chat-message me">
              <div className="message-bubble">
                <div className="message-name">{msg.userName}</div>
                <div className="message-text">{msg.message}</div>
                <div className="message-time">
                  {msg.timestamp.toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-form" onSubmit={handleSend}>
        <input
          type="text"
          placeholder="اكتب رسالتك..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="chat-input"
        />
        <button type="submit" className="chat-btn" disabled={!newMessage.trim()}>
          📤 إرسال
        </button>
      </form>
    </div>
  );
}