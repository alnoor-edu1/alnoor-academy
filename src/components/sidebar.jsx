import { useState } from "react";

export default function Sidebar({ nav, cur, go, user, logout }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleNavigation = (id) => {
    go(id);
    setIsOpen(false);
  };

  return (
    <>
      {/* زر القائمة للموبايل */}
      <button
        className="menu-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? "إغلاق القائمة" : "فتح القائمة"}
      >
        {isOpen ? "✕" : "☰"}
      </button>

      {/* Sidebar */}
      <aside className={`sidebar ${isOpen ? "open" : ""}`}>

        {/* رأس القائمة */}
        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-logo">
              🎓
            </div>

            <div className="brand-text">
              <div className="brand-name">
                أكاديمية النور
              </div>

              <div className="brand-subtitle">
                منصة التعليم المتكاملة
              </div>
            </div>
          </div>
        </div>

        {/* معلومات المستخدم */}
        <div className="sidebar-user">
          <div className="user-label">
            مرحباً
          </div>

          <div className="user-name">
            {user?.name || "المستخدم"}
          </div>
        </div>

        {/* روابط التنقل */}
        <nav className="sidebar-nav">
          {nav.map((item) =>
            item.divider ? (
              <div
                key={item.id}
                className="sidebar-divider"
              />
            ) : (
              <div
                key={item.id}
                className={`nav-item ${
                  cur === item.id ? "active" : ""
                }`}
                onClick={() => handleNavigation(item.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleNavigation(item.id);
                  }
                }}
              >
                {/* الأيقونة */}
                <span className="ni-ic">
                  {item.icon}
                </span>

                {/* اسم الصفحة */}
                <span className="nav-label">
                  {item.label}
                </span>

                {/* Badge */}
                {item.badge > 0 && (
                  <span className="nav-badge">
                    {item.badge}
                  </span>
                )}
              </div>
            )
          )}
        </nav>

        {/* تسجيل الخروج */}
        <div className="sidebar-footer">
          <button
            className="sidebar-logout"
            onClick={logout}
            type="button"
          >
            <span>🚪</span>
            <span>تسجيل الخروج</span>
          </button>
        </div>

      </aside>

      {/* طبقة خلفية للموبايل */}
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}