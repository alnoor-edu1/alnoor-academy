
import { useState, useEffect, useCallback, createContext, useContext } from "react";
import Chat from "./components/Chat";
import GradesModal from "./components/GradesModal";
import Sidebar from "./components/Sidebar";

import {
  auth,
  db,
  gProv,
  ensureUserDoc,
  fbErr,
} from "./firebase.js";

import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
} from "firebase/auth";

import {
  collection,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  setDoc,
} from "firebase/firestore";

/* ══════════════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════════════ */
const MN = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
  'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const now = new Date();
const CY = now.getFullYear();
const CM = now.getMonth();

const GRADES = [
  {id:'p1',name:'الصف الأول الابتدائي',level:'ابتدائي'},
  {id:'p2',name:'الصف الثاني الابتدائي',level:'ابتدائي'},
  {id:'p3',name:'الصف الثالث الابتدائي',level:'ابتدائي'},
  {id:'p4',name:'الصف الرابع الابتدائي',level:'ابتدائي'},
  {id:'p5',name:'الصف الخامس الابتدائي',level:'ابتدائي'},
  {id:'p6',name:'الصف السادس الابتدائي',level:'ابتدائي'},
  {id:'m1',name:'الصف الأول الإعدادي',level:'إعدادي'},
  {id:'m2',name:'الصف الثاني الإعدادي',level:'إعدادي'},
  {id:'m3',name:'الصف الثالث الإعدادي',level:'إعدادي'},
  {id:'s1',name:'الصف الأول الثانوي',level:'ثانوي'},
  {id:'s2',name:'الصف الثاني الثانوي',level:'ثانوي'},
  {id:'s3',name:'الصف الثالث الثانوي',level:'ثانوي'},
];

function mk(y,m) { return `${y}-${m}`; }
function today() { return new Date().toISOString().split('T')[0]; }

/* ══════════════════════════════════════════════════════════
   CONTEXT
══════════════════════════════════════════════════════════ */
const Ctx = createContext(null);
const useApp = () => useContext(Ctx);

/* ══════════════════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════════════════ */
function Toasts({ list, remove }) {
  const ic = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };
  return (
    <div style={{
      position: 'fixed', top: 16, left: '50%',
      transform: 'translateX(-50%)', zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8,
      width: 'calc(100% - 32px)', maxWidth: 380, pointerEvents: 'none',
    }}>
      {list.map(t => (
        <div key={t.id} className={`toast ${t.type==='success'?'ok':t.type==='error'?'er':t.type==='warning'?'wa':''} ${t.ex?'ex':''}`}>
          <span style={{ fontSize: 18 }}>{ic[t.type] || '💬'}</span>
          <span style={{ flex: 1, fontSize: 13 }}>{t.msg}</span>
          <button
            onClick={() => remove(t.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: 'var(--mu)', pointerEvents: 'all' }}
          >✕</button>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MODAL
══════════════════════════════════════════════════════════ */
function Modal({ open, close, title, children, footer, size = 530 }) {
  if (!open) return null;
  return (
    <div className="mo" onClick={e => e.target === e.currentTarget && close()}>
      <div className="md" style={{ maxWidth: size }}>
        <div className="mh">
          <h3 style={{ fontSize: 17, fontWeight: 800 }}>{title}</h3>
          <button onClick={close} className="btn bgh sm" style={{ padding: '6px 10px', fontSize: 16 }}>✕</button>
        </div>
        <div className="mb">{children}</div>
        {footer && <div className="mf">{footer}</div>}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   LOADING
══════════════════════════════════════════════════════════ */
function Loading() {
  return (
    <div className="ls">
      <div style={{ fontSize: 64, marginBottom: 14, animation: 'fUp 2s ease-in-out infinite' }}>🎓</div>
      <h2 style={{ color: '#fff', fontSize: 28, fontWeight: 900, marginBottom: 5 }}>أكاديمية النور</h2>
      <p style={{ color: 'rgba(255,255,255,.7)', fontSize: 14 }}>جاري التحميل...</p>
      <div className="lb"><div className="lbi" style={{ width: '100%' }}></div></div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PENDING SCREEN
══════════════════════════════════════════════════════════ */
function PendingScreen({ logout }) {
  return (
    <div className="ps">
      <div className="pc">
        <div style={{ fontSize: 68, marginBottom: 14 }}>⏳</div>
        <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 10 }}>طلبك قيد المراجعة</h2>
        <p style={{ color: 'var(--mu)', fontSize: 14, lineHeight: 1.9, marginBottom: 22 }}>
          تم استلام طلب تسجيلك بنجاح.<br/>
          في انتظار موافقة الإدارة أو المعلم المختص.<br/>
          يُرجى المراجعة لاحقاً.
        </p>
        <div style={{ background:'var(--wa-l)', border:'1px solid var(--wa)', borderRadius:'var(--r)', padding:'13px 16px', marginBottom:20, fontSize:13, color:'#78350f', fontWeight:600 }}>
          📞 للاستفسار: تواصل مع إدارة الأكاديمية
        </div>
        <button className="btn bgh wf" onClick={logout} style={{ color:'var(--er)', fontWeight:700 }}>🚪 خروج</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   LOGIN
══════════════════════════════════════════════════════════ */
function Login() {
  const { students, pendingStudents, setPendingStudents, toast } = useApp();
  const [tab, setTab] = useState('firebase');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [showP, setShowP] = useState(false);
  const [load, setLoad] = useState(false);
  const [sName, setSName] = useState('');
  const [grade, setGrade] = useState('');
  const [phone, setPhone] = useState('');
  const [sEmail, setSEmail] = useState('');
  const [sPass, setSPass] = useState('');
  const [showSPass, setShowSPass] = useState(false);

  const groups = {};
  GRADES.forEach(g => {
    if (!groups[g.level]) groups[g.level] = [];
    groups[g.level].push(g);
  });

  const doEmail = async () => {
    if (!email.trim() || !pass.trim()) { toast('يرجى إدخال البريد وكلمة المرور','error'); return; }
    setLoad(true);
    try { await signInWithEmailAndPassword(auth, email.trim(), pass.trim()); }
    catch (e) { const msg = fbErr(e.code); if (msg) toast(msg,'error'); }
    setLoad(false);
  };

  const doGoogle = async () => {
    setLoad(true);
    try { await signInWithPopup(auth, gProv); }
    catch (e) { const msg = fbErr(e.code); if (msg) toast(msg,'error'); }
    setLoad(false);
  };

  const doStudentRegister = async () => {
    if (!sName.trim()) { toast('يرجى إدخال الاسم الكامل','error'); return; }
    if (!grade) { toast('يرجى اختيار الصف','error'); return; }
    if (!phone.trim()) { toast('يرجى إدخال رقم الهاتف','error'); return; }
    if (!sEmail.trim()) { toast('يرجى إدخال البريد الإلكتروني','error'); return; }
    if (!sPass.trim() || sPass.length < 6) { toast('كلمة المرور يجب أن تكون 6 أحرف على الأقل','error'); return; }
    setLoad(true);
    try {
      if (pendingStudents.find(p => p.email === sEmail.trim())) {
        toast('هذا البريد مسجل بالفعل في طلبات الانتظار','error');
        setLoad(false); return;
      }
      if (students.find(s => s.email === sEmail.trim())) {
        toast('هذا البريد مسجل بالفعل كطالب','error');
        setLoad(false); return;
      }
      const userCred = await createUserWithEmailAndPassword(auth, sEmail.trim(), sPass.trim());
      const uid = userCred.user.uid;
      
      await setDoc(doc(db, 'users', uid), {
        uid, name: sName.trim(), email: sEmail.trim(),
        role: 'student_pending', grade, phone: phone.trim(),
        createdAt: new Date().toISOString(), status: 'pending',
      });
      
      await addDoc(collection(db, 'pendingStudents'), {
        uid, name: sName.trim(), grade, phone: phone.trim(),
        email: sEmail.trim(), requestedAt: today(), status: 'pending',
      });
      
      toast('✅ تم إرسال طلب التسجيل بنجاح! سيتم مراجعته من قبل الإدارة.', 'success');
      setSName(''); setGrade(''); setPhone(''); setSEmail(''); setSPass('');
      await signOut(auth);
    } catch (e) {
      const msg = fbErr(e.code) || 'حدث خطأ في التسجيل';
      toast(msg, 'error');
    }
    setLoad(false);
  };

  return (
    <div className="lp">
      <div className="lbg"></div>
      <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none' }}>
        {[{w:380,h:380,t:-90,r:-90},{w:280,h:280,b:-40,l:-40},{w:180,h:180,t:'38%',l:'28%'}].map((s,i)=>(
          <div key={i} style={{ position:'absolute', borderRadius:'50%', background:'#fff', opacity:.07, width:s.w, height:s.h, top:s.t, right:s.r, bottom:s.b, left:s.l }}></div>
        ))}
        {['📐','🔬','📖','🌍','🎨','💻'].map((e,i)=>(
          <div key={i} style={{ position:'absolute', fontSize:24+i*3, opacity:.11, color:'#fff', top:`${15+i*13}%`, left:`${8+i*14}%`, animation:`fUp ${2+i*.5}s ease-in-out infinite`, animationDelay:`${i*.3}s` }}>{e}</div>
        ))}
      </div>

      <div className="lpanel">
        <div className="lcard">
          <div style={{ width:68, height:68, borderRadius:16, background:'linear-gradient(135deg,#3b82f6,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:34, margin:'0 auto 16px', boxShadow:'0 8px 24px rgba(59,130,246,0.35)' }}>🎓</div>
          <h1 style={{ textAlign:'center', fontSize:24, fontWeight:900, marginBottom:4 }} className="tg">أكاديمية النور</h1>
          <p style={{ textAlign:'center', color:'var(--mu)', fontSize:12, marginBottom:22 }}>منصة التعليم الإلكتروني المتكاملة</p>

          <div className="tabs">
            {[['firebase','🔥 تسجيل الدخول'],['student','📝 تسجيل جديد']].map(([m,l])=>(
              <button key={m} className={`tab ${tab===m?'ac':''}`} onClick={()=>setTab(m)}>{l}</button>
            ))}
          </div>

          {tab==='firebase' && (
            <div style={{ animation:'fadeIn .4s ease' }}>
              <button
                className="btn wf lg"
                disabled={load}
                style={{ background:'#fff', color:'#3c4043', border:'2px solid var(--bd)', marginBottom:14, fontWeight:700, gap:10, justifyContent:'center' }}
                onClick={doGoogle}
              >
                <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink:0 }}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                {load ? 'جاري الدخول...' : 'تسجيل الدخول بـ Google'}
              </button>

              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <div style={{ flex:1, height:1, background:'var(--bd)' }}></div>
                <span style={{ fontSize:12, color:'var(--mu)', fontWeight:600 }}>أو بالبريد الإلكتروني</span>
                <div style={{ flex:1, height:1, background:'var(--bd)' }}></div>
              </div>

              <div className="fg">
                <label className="fl">📧 البريد الإلكتروني</label>
                <input className="inp" type="email" placeholder="example@email.com" value={email}
                  onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doEmail()}/>
              </div>
              <div className="fg">
                <label className="fl">🔒 كلمة المرور</label>
                <div style={{ position:'relative' }}>
                  <input type={showP?'text':'password'} className="inp" style={{ paddingLeft:42 }}
                    placeholder="••••••••" value={pass}
                    onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doEmail()}/>
                  <button type="button" onClick={()=>setShowP(p=>!p)}
                    style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:16 }}>
                    {showP?'🙈':'👁️'}
                  </button>
                </div>
              </div>
              <button className="btn bp wf lg" onClick={doEmail} disabled={load}>
                {load ? <><div className="sp"></div>&nbsp;جاري الدخول...</> : '🚀 دخول'}
              </button>

              <div style={{ marginTop:16, padding:'12px 14px', background:'#f8fafc', borderRadius:'var(--r)', border:'1px solid var(--bd)', fontSize:11, lineHeight:1.9, color:'var(--mu)' }}>
                <div style={{ fontWeight:800, color:'var(--tx)', marginBottom:3 }}>🗂️ الأدوار في Firestore ← users/&#123;uid&#125;</div>
                <div>• <code style={{ background:'#dbeafe', padding:'1px 6px', borderRadius:4, color:'#1e40af', fontWeight:700 }}>admin</code> ← صلاحيات كاملة</div>
                <div>• <code style={{ background:'#d1fae5', padding:'1px 6px', borderRadius:4, color:'#065f46', fontWeight:700 }}>teacher</code> ← لوحة المعلم</div>
                <div>• <code style={{ background:'#ede9fe', padding:'1px 6px', borderRadius:4, color:'#4c1d95', fontWeight:700 }}>student</code> ← لوحة الطالب</div>
              </div>
            </div>
          )}

          {tab==='student' && (
            <div style={{ animation:'fadeIn .4s ease' }}>
              <div className="fg"><label className="fl">الاسم الكامل</label><input className="inp" placeholder="أدخل اسمك الكامل" value={sName} onChange={e=>setSName(e.target.value)}/></div>
              <div className="fg"><label className="fl">الصف الدراسي</label>
                <select className="inp" value={grade} onChange={e=>setGrade(e.target.value)}>
                  <option value="">-- اختر الصف --</option>
                  {Object.entries(groups).map(([lv,gs])=>(
                    <optgroup key={lv} label={`المرحلة ${lv}`}>
                      {gs.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="fg"><label className="fl">رقم الهاتف</label><input className="inp" placeholder="01000000000" value={phone} onChange={e=>setPhone(e.target.value)}/></div>
              <div className="fg"><label className="fl">📧 البريد الإلكتروني</label><input className="inp" type="email" placeholder="example@email.com" value={sEmail} onChange={e=>setSEmail(e.target.value)}/></div>
              <div className="fg"><label className="fl">🔑 كلمة المرور</label>
                <div style={{ position:'relative' }}>
                  <input type={showSPass?'text':'password'} className="inp" style={{ paddingLeft:42 }}
                    placeholder="أدخل كلمة المرور (6 أحرف على الأقل)" value={sPass} onChange={e=>setSPass(e.target.value)}/>
                  <button type="button" onClick={()=>setShowSPass(p=>!p)}
                    style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:16 }}>
                    {showSPass?'🙈':'👁️'}
                  </button>
                </div>
              </div>
              <div style={{ marginBottom:16, padding:'11px 13px', background:'var(--wa-l)', borderRadius:'var(--r)', fontSize:12, color:'#92400e', fontWeight:600 }}>
                ⚠️ طلبك يحتاج موافقة الإدارة أو المعلم المختص قبل التفعيل
              </div>
              <button className="btn bp wf lg" onClick={doStudentRegister} disabled={load}>
                {load ? <><div className="sp"></div>&nbsp;جاري التسجيل...</> : '📝 إرسال طلب التسجيل'}
              </button>
            </div>
          )}
        </div>
        <div style={{ textAlign:'center', marginTop:14, color:'rgba(255,255,255,.5)', fontSize:11 }}>© 2025 أكاديمية النور التعليمية</div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   STUDENT DASHBOARD
══════════════════════════════════════════════════════════ */
function StudentDash({ user }) {
  const { students, subjects, teachers, announcements, setPage, setSelSub } = useApp();
  const student = students.find(s => s.id === user.sid);
  const gradeSubs = subjects.filter(s => s.grade === user.grade);
  const grade = GRADES.find(g => g.id === user.grade);
  const curKey = mk(CY, CM);
  const paidNow = gradeSubs.filter(s => student?.payments?.[s.id]?.[curKey]?.paid).length;
  const [chatOpen, setChatOpen] = useState(null);

  const open = sub => {
    const t = teachers.find(x => x.id === sub.teacher);
    setSelSub({ ...sub, student, teacherObj: t });
    setPage('subjectDetail');
  };

  return (
    <div style={{ animation:'fadeIn .5s ease' }}>
      <div style={{ background:'linear-gradient(135deg,#1e3a8a,#3b82f6,#8b5cf6)', borderRadius:'var(--rx)', padding:'20px 16px', marginBottom:16, position:'relative', overflow:'hidden', color:'#fff' }}>
        <div style={{ position:'absolute', top:-40, left:-40, width:150, height:150, borderRadius:'50%', background:'rgba(255,255,255,.06)' }}></div>
        <div style={{ position:'absolute', bottom:-20, right:-20, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,.04)' }}></div>
        <div style={{ position:'relative' }}>
          <div style={{ fontSize:12, color:'rgba(255,255,255,.75)', marginBottom:3 }}>لوحة الطالب</div>
          <h1 style={{ fontSize:20, fontWeight:900, marginBottom:3 }}>أهلاً، {user.name} 👋</h1>
          <div style={{ fontSize:13, color:'rgba(255,255,255,.8)', marginBottom:14 }}>{grade?.name}</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {[[gradeSubs.length,'مادة دراسية'],[paidNow,'مدفوع هذا الشهر'],[gradeSubs.length-paidNow,'غير مدفوع']].map(([v,l])=>(
              <div key={l} style={{ background:'rgba(255,255,255,.15)', border:'1px solid rgba(255,255,255,.2)', borderRadius:12, padding:'7px 12px', backdropFilter:'blur(10px)' }}>
                <div style={{ color:'#fff', fontWeight:800, fontSize:18 }}>{v}</div>
                <div style={{ color:'rgba(255,255,255,.75)', fontSize:10, fontWeight:600, marginTop:1 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background:'linear-gradient(135deg,var(--wa-l),#fde68a)', border:'1px solid var(--wa)', borderRadius:'var(--rl)', padding:'12px 14px', marginBottom:16, display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:20 }}>📅</span>
        <div>
          <div style={{ fontWeight:700, color:'#78350f', fontSize:13 }}>الشهر الحالي: {MN[CM]} {CY}</div>
          <div style={{ fontSize:11, color:'#92400e' }}>حالة السداد تُحدَّث من قِبل إدارة الأكاديمية شهرياً</div>
        </div>
      </div>

      {announcements.length > 0 && (
        <div className="card" style={{ padding:'14px 16px', marginBottom:16, borderRadius:'var(--rx)' }}>
          <div className="st">📢 إعلانات الأكاديمية</div>
          {announcements.slice(0,2).map(a => {
            const bc = a.type==='warning'?'var(--wa)':a.type==='success'?'var(--ok)':'var(--pr)';
            const bg = a.type==='warning'?'var(--wa-l)':a.type==='success'?'var(--ok-l)':'var(--pr-l)';
            return (
              <div key={a.id} style={{ borderRight:`4px solid ${bc}`, borderRadius:'0 var(--r) var(--r) 0', padding:'10px 12px', marginBottom:8, background:bg }}>
                <div style={{ fontWeight:700, fontSize:13 }}>{a.title}</div>
                <div style={{ fontSize:12, color:'var(--mu)', marginTop:2 }}>{a.content}</div>
              </div>
            );
          })}
        </div>
      )}

      <div className="st">📚 موادك الدراسية – {MN[CM]} {CY}</div>
      <div className="subjects-grid">
        {gradeSubs.map((sub, i) => {
          const t = teachers.find(x => x.id === sub.teacher);
          const mo = student?.payments?.[sub.id]?.[curKey];
          const paid = mo?.paid;
          return (
            <div key={sub.id} className="scard-mobile" onClick={()=>open(sub)} style={{ animationDelay:`${i*.07}s`, animation:'fadeIn .5s ease forwards', opacity:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div className={sub.color} style={{ width:56, height:56, borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, flexShrink:0 }}>{sub.emoji}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6 }}>
                    <h3 style={{ fontSize:14, fontWeight:800, color:'var(--tx)' }}>{sub.name}</h3>
                    <span className={`badge ${paid?'bok-b':'ber-b'}`} style={{ flexShrink:0, fontSize:10 }}>{paid?'✅ مدفوع':'❌ غير مدفوع'}</span>
                  </div>
                  <div style={{ fontSize:12, color:'var(--mu)', marginTop:2 }}>👨‍🏫 {t?.name || 'غير محدد'}</div>
                  <div style={{ fontSize:12, color:'var(--pr)', fontWeight:700 }}>💰 {sub.fee} ج.م / شهر</div>
                </div>
              </div>

              {student?.grades?.[sub.id] && (
                <div style={{ marginTop:10, padding:'7px 10px', background:'#ede9fe', borderRadius:9, fontSize:11, color:'#5b21b6', fontWeight:600 }}>
                  📊 امتحان أول: {student.grades[sub.id].exam1||'-'} | ثاني: {student.grades[sub.id].exam2||'-'} | نهائي: {student.grades[sub.id].final||'-'}
                </div>
              )}

              {paid && mo.paidDate && <div style={{ fontSize:11, color:'var(--ok)', fontWeight:600, marginTop:6 }}>📅 تاريخ السداد: {mo.paidDate}</div>}

              <div style={{ marginTop:10, display:'flex', gap:7 }}>
                <button className="btn bp sm" style={{ flex:1, fontSize:12 }} onClick={e=>{e.stopPropagation();open(sub);}}>📖 فتح المادة</button>
                <button
                  className="btn sm"
                  style={{ flex:1, fontSize:12, background:'#f3e8ff', color:'#7C3AED', border:'none', borderRadius:'var(--r)', fontFamily:'inherit', fontWeight:600, cursor:'pointer' }}
                  onClick={e => { e.stopPropagation(); setChatOpen({ id:sub.id, name:sub.name, teacher:t?.name }); }}
                >💬 محادثة</button>
              </div>
            </div>
          );
        })}
      </div>

      {chatOpen && (
        <div className="chat-modal-overlay" onClick={()=>setChatOpen(null)}>
          <div className="chat-modal" onClick={e=>e.stopPropagation()}>
            <Chat subjectId={chatOpen.id} subjectName={chatOpen.name} teacherName={chatOpen.teacher} onClose={()=>setChatOpen(null)}/>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SUBJECT DETAIL
══════════════════════════════════════════════════════════ */
function SubjectDetail({ sub, onBack }) {
  const { students } = useApp();
  const grade = GRADES.find(g => g.id === sub.grade);
  const student = students.find(s => s.id === sub.student?.id);
  const months = Array.from({ length: CM + 1 }, (_, i) => i);

  return (
    <div style={{ animation:'fadeIn .5s ease' }}>
      <button className="btn bgh sm" onClick={onBack} style={{ marginBottom:14, fontSize:13 }}>← العودة</button>

      <div style={{ borderRadius:'var(--rx)', marginBottom:18, overflow:'hidden', position:'relative' }}>
        <div className={sub.color} style={{ height:160, display:'flex', alignItems:'center', justifyContent:'center', fontSize:72 }}>{sub.emoji}</div>
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(0,0,0,.6),transparent)' }}></div>
        <div style={{ position:'absolute', bottom:16, right:16 }}>
          <div className="glass" style={{ borderRadius:12, padding:'10px 16px', display:'inline-block' }}>
            <h1 style={{ fontSize:18, fontWeight:900, color:'var(--tx)' }}>{sub.name}</h1>
            <p style={{ color:'var(--mu)', marginTop:2, fontSize:12 }}>{grade?.name}</p>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding:'16px', borderRadius:'var(--rx)', marginBottom:14 }}>
        <div className="st" style={{ marginBottom:12 }}>📋 معلومات المادة</div>
        {[['المادة',sub.name,'📚'],['المعلم',sub.teacherObj?.name||'—','👨‍🏫'],['الصف',grade?.name,'🏫'],['القسط الشهري',`${sub.fee} ج.م`,'💰']].map(([l,v,ic])=>(
          <div key={l} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <div style={{ width:34, height:34, borderRadius:9, background:'var(--pr-l)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>{ic}</div>
            <div>
              <div style={{ fontSize:10, color:'var(--mu)' }}>{l}</div>
              <div style={{ fontWeight:700, fontSize:13 }}>{v}</div>
            </div>
          </div>
        ))}
      </div>

      {(()=>{
        const k = mk(CY, CM);
        const mo = student?.payments?.[sub.id]?.[k];
        const paid = mo?.paid;
        return (
          <div style={{ borderRadius:'var(--rx)', padding:'16px 18px', marginBottom:14, background: paid?'linear-gradient(135deg,#10b981,#059669)':'linear-gradient(135deg,#ef4444,#dc2626)', color:'#fff' }}>
            <div style={{ fontSize:32, marginBottom:6 }}>{paid?'✅':'⚠️'}</div>
            <div style={{ fontSize:17, fontWeight:800 }}>{paid?'مدفوع':'غير مدفوع'}</div>
            <div style={{ fontSize:12, opacity:.85, marginTop:2 }}>{MN[CM]} {CY}</div>
            {paid && mo.paidDate && <div style={{ fontSize:11, marginTop:7, background:'rgba(255,255,255,.2)', borderRadius:7, padding:'4px 10px', display:'inline-block' }}>📅 {mo.paidDate}</div>}
          </div>
        );
      })()}

      <div className="card" style={{ padding:'16px', borderRadius:'var(--rx)' }}>
        <div className="st">📅 سجل الأقساط – {CY}</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:7 }}>
          {months.map(m => {
            const k = mk(CY, m);
            const mo = student?.payments?.[sub.id]?.[k];
            const paid = mo?.paid;
            const isCur = m === CM;
            return (
              <div key={m} className={`mc ${paid?'paid':'unpaid'} ${isCur?'current':''}`} style={{ position:'relative' }}>
                {isCur && <div style={{ position:'absolute', top:-9, right:'50%', transform:'translateX(50%)', background:'var(--pr)', color:'#fff', fontSize:8, padding:'1px 5px', borderRadius:3, fontWeight:700, whiteSpace:'nowrap' }}>الحالي</div>}
                <div className="mc-n">{MN[m]}</div>
                <div className="mc-ic">{paid?'✅':'❌'}</div>
                {paid && mo.paidDate && <div className="mc-d">{mo.paidDate}</div>}
                {!paid && <div className="mc-d" style={{ color:'#fca5a5' }}>غير مدفوع</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ADMIN OVERVIEW
══════════════════════════════════════════════════════════ */
function AdminOverview() {
  const { students, teachers, subjects, pendingStudents, announcements, setPage } = useApp();
  const pnd = pendingStudents.length;
  const stats = [
    {l:'إجمالي الطلاب',v:students.length,ic:'👨‍🎓',c:'g1'},
    {l:'طلبات معلّقة',v:pnd,ic:'⏳',c:'g3'},
    {l:'المعلمون',v:teachers.length,ic:'👩‍🏫',c:'g2'},
    {l:'المواد',v:subjects.length,ic:'📚',c:'g4'},
    {l:'الصفوف',v:GRADES.length,ic:'🏫',c:'g5'},
    {l:'الإعلانات',v:announcements.length,ic:'📢',c:'g6'},
  ];
  return (
    <div style={{ animation:'fadeIn .5s ease' }}>
      <div style={{ background:'linear-gradient(135deg,#1e3a8a,#3b82f6,#8b5cf6)', borderRadius:'var(--rx)', padding:'20px 16px', marginBottom:18, color:'#fff', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-30, left:-30, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,.07)' }}></div>
        <div style={{ fontSize:12, opacity:.75 }}>لوحة تحكم المدير</div>
        <h1 style={{ fontSize:19, fontWeight:900, marginTop:3 }}>👑 مرحباً في لوحة التحكم</h1>
        <p style={{ opacity:.75, marginTop:4, fontSize:12 }}>أكاديمية النور — تحكم كامل في المنظومة</p>
      </div>

      {pnd > 0 && (
        <div style={{ background:'var(--wa-l)', border:'2px solid var(--wa)', borderRadius:'var(--rl)', padding:'13px 14px', marginBottom:14, display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:9 }}>
            <span style={{ fontSize:22 }}>⏳</span>
            <div>
              <div style={{ fontWeight:800, color:'#78350f', fontSize:13 }}>{pnd} طلب بانتظار الموافقة</div>
              <div style={{ fontSize:11, color:'#92400e' }}>يجب مراجعة الطلبات والبت فيها</div>
            </div>
          </div>
          <button className="btn bwa sm" onClick={()=>setPage('pending')}>مراجعة</button>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12, marginBottom:20 }}>
        {stats.map((s,i)=>(
          <div key={i} className={`sc ${s.c}`} style={{ animationDelay:`${i*.08}s`, animation:'fadeIn .5s ease forwards', opacity:0, padding:'16px 14px' }}>
            <div className="si">{s.ic}</div>
            <div className="sn" style={{ fontSize:26 }}>{s.v}</div>
            <div className="sl">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ borderRadius:'var(--rx)', overflow:'hidden' }}>
        <div style={{ padding:'13px 16px', borderBottom:'1px solid var(--bd)' }}><div className="st" style={{ marginBottom:0 }}>👨‍🎓 آخر الطلاب المسجلين</div></div>
        <div className="tw">
          <table>
            <thead><tr><th>الطالب</th><th>الصف</th><th>قسط {MN[CM]}</th></tr></thead>
            <tbody>
              {students.slice(0,6).map(s => {
                const g = GRADES.find(x=>x.id===s.grade);
                const subs = subjects.filter(x=>x.grade===s.grade);
                const k = mk(CY,CM);
                const paid = subs.filter(x=>s.payments?.[x.id]?.[k]?.paid).length;
                return (
                  <tr key={s.id}>
                    <td><div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div className="av" style={{ background:'var(--pr-l)', color:'var(--pr)', width:32, height:32, fontSize:13 }}>{s.name[0]}</div>
                      <span style={{ fontWeight:600, fontSize:13 }}>{s.name}</span>
                    </div></td>
                    <td><span className="badge bpr-b" style={{ fontSize:10 }}>{g?.name}</span></td>
                    <td><span className={`badge ${paid===subs.length&&subs.length>0?'bok-b':paid>0?'bwa-b':'ber-b'}`}>{paid}/{subs.length}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PENDING REGISTRATIONS
══════════════════════════════════════════════════════════ */
function PendingReg() {
  const { pendingStudents, setPendingStudents, students, setStudents, subjects, toast } = useApp();

  const approve = async req => {
    const subs = subjects.filter(s=>s.grade===req.grade);
    const payments = {};
    subs.forEach(sub=>{
      payments[sub.id]={};
      for(let m=0;m<=CM;m++) payments[sub.id][mk(CY,m)]={paid:false,paidDate:null};
    });
    
    const sid = req.uid;
    const newStudent = { 
      id: sid, 
      name:req.name, 
      grade:req.grade, 
      phone:req.phone, 
      email:req.email, 
      status:'approved', 
      registeredAt:today(), 
      payments 
    };
    
    try {
      await setDoc(doc(db, 'students', sid), newStudent);
      await updateDoc(doc(db, 'users', req.uid), {
        role: 'student',
        status: 'approved',
        studentId: sid
      });
      await deleteDoc(doc(db, 'pendingStudents', req.id));
      toast(`✅ تم قبول تسجيل ${req.name} وتم تفعيل حسابه`, 'success');
    } catch(e) { 
      console.error('Error approving student:', e); 
      toast('حدث خطأ أثناء الموافقة', 'error');
    }
  };

  const reject = async req => {
    if(!confirm(`رفض طلب ${req.name}؟`)) return;
    try {
      await updateDoc(doc(db, 'users', req.uid), {
        status: 'rejected',
        role: 'student_pending'
      });
      await deleteDoc(doc(db, 'pendingStudents', req.id));
      toast(`تم رفض طلب ${req.name}`, 'warning');
    } catch(e) { 
      console.error('Error rejecting student:', e);
      toast('حدث خطأ أثناء الرفض', 'error');
    }
  };

  return (
    <div style={{ animation:'fadeIn .5s ease' }}>
      <div style={{ marginBottom:18 }}>
        <div style={{ fontSize:20, fontWeight:800 }}>⏳ طلبات التسجيل</div>
        <div style={{ fontSize:13, color:'var(--mu)', marginTop:3 }}>{pendingStudents.length} طلب في انتظار الموافقة</div>
      </div>
      {pendingStudents.length === 0 ? (
        <div style={{ textAlign:'center', padding:56 }}>
          <div style={{ fontSize:56, marginBottom:14 }}>✅</div>
          <div style={{ fontSize:17, fontWeight:700, color:'var(--mu)' }}>لا توجد طلبات معلّقة</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {pendingStudents.map((r,i)=>{
            const g = GRADES.find(x=>x.id===r.grade);
            return (
              <div key={r.id} className="card" style={{ padding:'14px', borderRadius:'var(--rx)', borderRight:'4px solid var(--wa)', animationDelay:`${i*.09}s`, animation:'fadeIn .5s ease forwards', opacity:0 }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                  <div style={{ width:44, height:44, borderRadius:12, background:'var(--wa-l)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>🎒</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:800, fontSize:15 }}>{r.name}</div>
                    <div style={{ color:'var(--mu)', fontSize:12, marginTop:2 }}>{g?.name}</div>
                    <div style={{ color:'var(--li)', fontSize:11, marginTop:2 }}>📞 {r.phone}</div>
                    <div style={{ fontSize:11, color:'var(--li)' }}>📧 {r.email}</div>
                    <div style={{ fontSize:11, color:'var(--li)' }}>📅 {r.requestedAt}</div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:9, marginTop:12 }}>
                  <button className="btn bok wf" onClick={()=>approve(r)} style={{ fontSize:13 }}>✅ قبول وتفعيل</button>
                  <button className="btn ber sm" onClick={()=>reject(r)}>❌ رفض</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ADMIN PAYMENTS
══════════════════════════════════════════════════════════ */
function AdminPayments() {
  const { students, setStudents, subjects, toast } = useApp();
  const [gf, setGf] = useState('');
  const [search, setSearch] = useState('');
  const [selM, setSelM] = useState(CM);
  const filtered = students.filter(s => (!gf||s.grade===gf) && (!search||s.name.includes(search)));

  const toggle = async (sid, subId, mIdx, cur) => {
    const k = mk(CY,mIdx);
    const student = students.find(s=>s.id===sid);
    if (!student) return;
    const np = JSON.parse(JSON.stringify(student.payments||{}));
    if (!np[subId]) np[subId]={};
    np[subId][k] = { paid:!cur, paidDate:!cur?today():null };
    try { await updateDoc(doc(db,'students',sid),{ payments: np }); }
    catch(e){ console.error(e); toast('خطأ في الحفظ','error'); return; }
    toast(cur?`تم إلغاء سداد ${MN[mIdx]}`:`✅ تم تسجيل سداد ${MN[mIdx]}`,'success');
  };

  const ensureKey = (student,subId,mIdx) => {
    const k = mk(CY,mIdx);
    return student.payments?.[subId]?.[k]||{paid:false,paidDate:null};
  };

  return (
    <div style={{ animation:'fadeIn .5s ease' }}>
      <div style={{ marginBottom:18 }}>
        <div style={{ fontSize:20, fontWeight:800 }}>💰 إدارة الأقساط الشهرية</div>
        <div style={{ fontSize:13, color:'var(--mu)', marginTop:2 }}>تسجيل حالة السداد شهرياً</div>
      </div>

      <div className="card" style={{ padding:'12px 14px', marginBottom:14, borderRadius:'var(--rl)' }}>
        <div style={{ fontWeight:700, marginBottom:8, fontSize:13 }}>📅 اختر الشهر:</div>
        <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:4, scrollbarWidth:'none', WebkitScrollbarWidth:'none' }}>
          {MN.slice(0,CM+1).map((mn,i)=>(
            <button key={i} onClick={()=>setSelM(i)}
              style={{ flexShrink:0, padding:'7px 14px', borderRadius:20, fontFamily:'inherit', fontSize:12, fontWeight:700, border:'2px solid', borderColor:selM===i?'var(--pr)':'var(--bd)', background:selM===i?'linear-gradient(135deg,var(--pr),var(--se))':'#fff', color:selM===i?'#fff':'var(--mu)', cursor:'pointer', transition:'all 0.2s' }}>
              {mn}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding:'11px 13px', marginBottom:13, display:'flex', gap:9, borderRadius:'var(--rl)', flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:'1 1 160px', minWidth:0 }}>
          <span style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', color:'var(--mu)', fontSize:13 }}>🔍</span>
          <input className="inp" style={{ paddingRight:34, fontSize:13 }} placeholder="بحث بالاسم..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select className="inp" style={{ flex:'1 1 140px', fontSize:13 }} value={gf} onChange={e=>setGf(e.target.value)}>
          <option value="">كل الصفوف</option>
          {GRADES.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      {filtered.map(student => {
        const subs = subjects.filter(s=>s.grade===student.grade && student.payments?.[s.id]);
        if(!subs.length)return null;
        const k = mk(CY,selM);
        const pc = subs.filter(s=>student.payments?.[s.id]?.[k]?.paid).length;
        return (
          <div key={student.id} className="card" style={{ marginBottom:13, borderRadius:'var(--rx)', overflow:'hidden' }}>
            <div style={{ padding:'11px 14px', background:'var(--bg)', borderBottom:'1px solid var(--bd)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                <div className="av" style={{ background:'var(--pr-l)', color:'var(--pr)', width:36, height:36, fontSize:14 }}>{student.name[0]}</div>
                <div>
                  <div style={{ fontWeight:700, fontSize:14 }}>{student.name}</div>
                  <div style={{ fontSize:11, color:'var(--mu)' }}>{GRADES.find(g=>g.id===student.grade)?.name}</div>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                <span style={{ fontSize:11, color:'var(--mu)', fontWeight:600 }}>{MN[selM]}</span>
                <span className={`badge ${pc===subs.length?'bok-b':pc>0?'bwa-b':'ber-b'}`}>{pc}/{subs.length}</span>
              </div>
            </div>
            <div style={{ padding:'12px 13px', display:'flex', flexDirection:'column', gap:9 }}>
              {subs.map(sub=>{
                const mo = ensureKey(student,sub.id,selM);
                const paid = mo.paid;
                return (
                  <div key={sub.id} style={{ border:`2px solid ${paid?'var(--ok)':'var(--bd)'}`, borderRadius:'var(--r)', padding:'11px 13px', background:paid?'var(--ok-l)':'#fff', display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:20 }}>{sub.emoji}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:13 }}>{sub.name}</div>
                      <div style={{ fontSize:11, color:'var(--mu)' }}>{sub.fee} ج.م</div>
                      {paid && mo.paidDate && <div style={{ fontSize:10, color:'#047857', fontWeight:600 }}>📅 {mo.paidDate}</div>}
                    </div>
                    <button className={`btn sm ${paid?'ber':'bok'}`} style={{ fontSize:11, flexShrink:0 }} onClick={()=>toggle(student.id,sub.id,selM,paid)}>
                      {paid?'إلغاء':'✅ سداد'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {filtered.length===0 && <div style={{ textAlign:'center', padding:48, color:'var(--mu)' }}><div style={{ fontSize:48 }}>🔍</div><div style={{ marginTop:10 }}>لا توجد نتائج</div></div>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PAYMENT REPORTS
══════════════════════════════════════════════════════════ */
function PayReports() {
  const { students, subjects, teachers } = useApp();
  const [gf, setGf] = useState('');
  const [mf, setMf] = useState(CM);
  const filtered = students.filter(s=>!gf||s.grade===gf);
  const k = mk(CY,mf);

  const totRev = filtered.reduce((t,s)=>t+subjects.filter(sub=>sub.grade===s.grade).filter(sub=>s.payments?.[sub.id]?.[k]?.paid).reduce((sum,sub)=>sum+sub.fee,0),0);
  const totExp = filtered.reduce((t,s)=>t+subjects.filter(sub=>sub.grade===s.grade).reduce((sum,sub)=>sum+sub.fee,0),0);

  const teacherStats = teachers.map(teacher => {
    const teacherSubjects = subjects.filter(sub => sub.teacher === teacher.id);
    let totalPaid = 0;
    let totalStudents = 0;
    let paidStudents = 0;
    
    teacherSubjects.forEach(sub => {
      const gradeStudents = students.filter(s => s.grade === sub.grade);
      totalStudents += gradeStudents.length;
      gradeStudents.forEach(s => {
        if (s.payments?.[sub.id]?.[k]?.paid) {
          totalPaid += sub.fee;
          paidStudents++;
        }
      });
    });
    
    const teacherShare = Math.round(totalPaid * 0.7);
    
    return {
      ...teacher,
      subjectsCount: teacherSubjects.length,
      totalStudents,
      paidStudents,
      totalPaid,
      teacherShare
    };
  }).filter(t => t.subjectsCount > 0);

  return (
    <div style={{ animation:'fadeIn .5s ease' }}>
      <div style={{ marginBottom:18 }}><div style={{ fontSize:20, fontWeight:800 }}>📊 تقارير المدفوعات</div></div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:11, marginBottom:16 }}>
        {[[totRev.toLocaleString()+' ل.س','إجمالي المحصّل','g2'],[(totExp-totRev).toLocaleString()+' ج.م','المتأخرات','g3']].map(([v,l,c])=>(
          <div key={l} className={`sc ${c}`} style={{ padding:16, borderRadius:'var(--rx)' }}>
            <div style={{ fontSize:18, fontWeight:900 }}>{v}</div>
            <div style={{ opacity:.85, marginTop:3, fontSize:11 }}>{l}</div>
          </div>
        ))}
        <div className="sc g1" style={{ padding:16, borderRadius:'var(--rx)', gridColumn:'span 2' }}>
          <div style={{ fontSize:24, fontWeight:900 }}>{(totExp?Math.round(totRev/totExp*100):0)}%</div>
          <div style={{ opacity:.85, marginTop:3, fontSize:11 }}>نسبة السداد – {MN[mf]}</div>
        </div>
      </div>

      <div className="card" style={{ padding:'16px', marginBottom:14, borderRadius:'var(--rx)' }}>
        <div style={{ fontSize:16, fontWeight:800, marginBottom:14 }}>👨‍🏫 نسبة المعلمين (70%) – {MN[mf]} {CY}</div>
        <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
          {teacherStats.map(teacher => (
            <div key={teacher.id} style={{ border:'2px solid var(--bd)', borderRadius:'var(--r)', padding:'14px', background:'#fff' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                <div className={teacher.color} style={{ width:40, height:40, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{teacher.avatar}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:14 }}>{teacher.name}</div>
                  <div style={{ fontSize:11, color:'var(--mu)' }}>{teacher.subject}</div>
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:18, fontWeight:900, color:'var(--pr)' }}>{teacher.teacherShare.toLocaleString()} ج.م</div>
                  <div style={{ fontSize:10, color:'var(--mu)' }}>المستحق</div>
                </div>
              </div>
              
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:8 }}>
                <div style={{ background:'var(--bg)', borderRadius:8, padding:'8px 10px', textAlign:'center' }}>
                  <div style={{ fontWeight:700, fontSize:14 }}>{teacher.subjectsCount}</div>
                  <div style={{ fontSize:10, color:'var(--mu)' }}>مواد</div>
                </div>
                <div style={{ background:'var(--bg)', borderRadius:8, padding:'8px 10px', textAlign:'center' }}>
                  <div style={{ fontWeight:700, fontSize:14 }}>{teacher.paidStudents}/{teacher.totalStudents}</div>
                  <div style={{ fontSize:10, color:'var(--mu)' }}>طلاب دافعوا/الإجمالي</div>
                </div>
                <div style={{ background:'var(--bg)', borderRadius:8, padding:'8px 10px', textAlign:'center' }}>
                  <div style={{ fontWeight:700, fontSize:14 }}>{teacher.totalPaid.toLocaleString()} ج.م</div>
                  <div style={{ fontSize:10, color:'var(--mu)' }}>إجمالي المدفوع</div>
                </div>
              </div>
              
              <div style={{ fontSize:11, color:'var(--mu)', marginBottom:4 }}>
                المعادلة: {teacher.totalPaid.toLocaleString()} × 70% = {teacher.teacherShare.toLocaleString()} ج.م
              </div>
              <div style={{ height:6, background:'var(--bg)', borderRadius:3, overflow:'hidden' }}>
                <div style={{ height:'100%', width:'70%', background:'linear-gradient(135deg,var(--pr),var(--se))', borderRadius:3 }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding:'11px 13px', marginBottom:13, display:'flex', gap:9, borderRadius:'var(--rl)', flexWrap:'wrap' }}>
        <select className="inp" style={{ flex:'1 1 140px', fontSize:13 }} value={gf} onChange={e=>setGf(e.target.value)}>
          <option value="">كل الصفوف</option>{GRADES.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select className="inp" style={{ flex:'1 1 110px', fontSize:13 }} value={mf} onChange={e=>setMf(+e.target.value)}>
          {MN.slice(0,CM+1).map((mn,i)=><option key={i} value={i}>{mn}</option>)}
        </select>
      </div>

      <div style={{ fontSize:16, fontWeight:800, marginBottom:12 }}>👨‍🎓 تفاصيل الطلاب</div>

      <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
        {filtered.map(s=>{
          const g = GRADES.find(x=>x.id===s.grade);
          const subs = subjects.filter(x=>x.grade===s.grade);
          const ps = subs.filter(sub=>s.payments?.[sub.id]?.[k]?.paid);
          const paid = ps.reduce((sum,sub)=>sum+sub.fee,0);
          const total = subs.reduce((sum,sub)=>sum+sub.fee,0);
          const pct = total?Math.round(paid/total*100):0;
          return (
            <div key={s.id} className="card" style={{ padding:'13px 14px', borderRadius:'var(--rl)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:10 }}>
                <div className="av" style={{ background:'var(--pr-l)', color:'var(--pr)', width:36, height:36, fontSize:14 }}>{s.name[0]}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:13 }}>{s.name}</div>
                  <div style={{ fontSize:11, color:'var(--mu)' }}>{g?.name}</div>
                </div>
                <span className={`badge ${ps.length===subs.length&&subs.length>0?'bok-b':ps.length>0?'bwa-b':'ber-b'}`} style={{ fontSize:11 }}>{ps.length}/{subs.length}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:6 }}>
                <span style={{ color:'var(--ok)', fontWeight:700 }}>مدفوع: {paid.toLocaleString()} ج.م</span>
                <span style={{ color:'var(--er)', fontWeight:700 }}>متأخر: {(total-paid).toLocaleString()} ج.م</span>
              </div>
              <div style={{ height:7, background:'var(--bg)', borderRadius:4, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${pct}%`, background:pct===100?'var(--ok)':pct>50?'var(--wa)':'var(--er)', borderRadius:4, transition:'width 0.5s ease' }}></div>
              </div>
              <div style={{ textAlign:'left', fontSize:11, color:'var(--mu)', marginTop:3 }}>{pct}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ADMIN STUDENTS
══════════════════════════════════════════════════════════ */
function AdminStudents() {
  const { students, subjects, teachers, toast } = useApp();
  const [search, setSearch] = useState('');
  const [gf, setGf] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: '', grade: '', phone: '', email: '' });
  const [selectedSubjects, setSelectedSubjects] = useState([]);

  const filtered = students.filter(
    s => s.name?.includes(search) && (!gf || s.grade === gf)
  );

  const openAdd = () => { 
    setForm({ name:'', grade:'', phone:'', email:'' }); 
    setSelectedSubjects([]);
    setModal('add'); 
  };
  
  const openEdit = (s) => { 
    setForm({ ...s }); 
    setSelectedSubjects([]);
    setModal('edit'); 
  };

  const availableSubjects = subjects.filter(s => s.grade === form.grade);

  const toggleSubject = (subId) => {
    setSelectedSubjects(prev => 
      prev.includes(subId) 
        ? prev.filter(id => id !== subId) 
        : [...prev, subId]
    );
  };

  const save = async () => {
    if (!form.name.trim() || !form.grade) { 
      toast('يرجى ملء الحقول الأساسية', 'error'); 
      return; 
    }
    try {
      if (modal === 'add') {
        const payments = {};
        selectedSubjects.forEach(subId => {
          payments[subId] = {};
          for (let m = 0; m <= CM; m++) {
            payments[subId][mk(CY, m)] = { paid: false, paidDate: null };
          }
        });
        
        await addDoc(collection(db, "students"), { 
          ...form, 
          status: "approved", 
          registeredAt: today(),
          payments 
        });
        toast('تم إضافة الطالب ✅', 'success');
      }
      if (modal === 'edit') {
        await updateDoc(doc(db, "students", form.id), { 
          name: form.name, 
          grade: form.grade, 
          phone: form.phone, 
          email: form.email 
        });
        toast('تم التحديث ✅', 'success');
      }
      setModal(null);
    } catch (e) { 
      console.error(e); 
      toast('خطأ ❌', 'error'); 
    }
  };

  const del = async (id) => {
    if (!confirm('حذف هذا الطالب؟')) return;
    try { 
      await deleteDoc(doc(db, "students", id)); 
      toast('تم الحذف 🗑️', 'warning'); 
    } catch (e) { 
      console.error(e); 
      toast('خطأ في الحذف ❌', 'error'); 
    }
  };

  return (
    <div style={{ animation: 'fadeIn .5s ease' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
        <div>
          <div style={{ fontSize:20, fontWeight:800 }}>👨‍🎓 إدارة الطلاب</div>
          <div style={{ fontSize:13, color:'var(--mu)', marginTop:2 }}>{filtered.length} طالب</div>
        </div>
        <button className="btn bp sm" onClick={openAdd}>➕ إضافة</button>
      </div>

      <div className="card" style={{ padding:'11px 13px', marginBottom:13, display:'flex', gap:9, flexWrap:'wrap', borderRadius:'var(--rl)' }}>
        <div style={{ position:'relative', flex:'1 1 160px', minWidth:0 }}>
          <span style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', color:'var(--mu)', fontSize:13 }}>🔍</span>
          <input className="inp" style={{ paddingRight:34, fontSize:13 }} placeholder="بحث بالاسم..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select className="inp" style={{ flex:'1 1 140px', fontSize:13 }} value={gf} onChange={e=>setGf(e.target.value)}>
          <option value="">كل الصفوف</option>
          {GRADES.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {filtered.map((s,i) => {
          const g = GRADES.find(x=>x.id===s.grade);
          const studentSubjects = subjects.filter(x => x.grade === s.grade && s.payments?.[x.id]);
          const k = mk(CY,CM);
          const paid = studentSubjects.filter(x => s.payments?.[x.id]?.[k]?.paid).length;
          return (
            <div key={s.id} className="card" style={{ padding:'13px 14px', borderRadius:'var(--rl)', animationDelay:`${i*.05}s`, animation:'fadeIn .4s ease forwards', opacity:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div className="av" style={{ background:'var(--pr-l)', color:'var(--pr)', width:40, height:40, fontSize:15 }}>{s.name[0]}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:14 }}>{s.name}</div>
                  <div style={{ fontSize:11, color:'var(--mu)' }}>{g?.name}</div>
                  {s.phone && <div style={{ fontSize:11, color:'var(--li)' }}>📞 {s.phone}</div>}
                  {studentSubjects.length > 0 && (
                    <div style={{ fontSize:10, color:'var(--pr)', marginTop:2 }}>
                      📚 {studentSubjects.map(s => s.emoji).join(' ')} ({studentSubjects.length})
                    </div>
                  )}
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
                  <span className={`badge ${paid===studentSubjects.length&&studentSubjects.length>0?'bok-b':paid>0?'bwa-b':'ber-b'}`} style={{ fontSize:10 }}>
                    {studentSubjects.length > 0 ? `${paid}/${studentSubjects.length}` : '—'}
                  </span>
                  <div style={{ display:'flex', gap:5 }}>
                    <button className="btn bgh sm" style={{ padding:'5px 9px', color:'var(--pr)', fontWeight:700 }}
                      onClick={async () => {
                        const availableSubs = subjects.filter(x => x.grade === s.grade && !s.payments?.[x.id]);
                        if (availableSubs.length === 0) {
                          toast('الطالب مسجل في جميع مواد صفه', 'info');
                          return;
                        }
                        
                        const choice = prompt(
                          '📚 مواد متاحة للإضافة:\n\n' +
                          availableSubs.map((sub, i) => `${i + 1}. ${sub.emoji} ${sub.name} - ${sub.fee} ج.م`).join('\n') +
                          '\n\nأدخل رقم المادة:'
                        );
                        
                        if (choice) {
                          const idx = parseInt(choice) - 1;
                          if (idx >= 0 && idx < availableSubs.length) {
                            const sub = availableSubs[idx];
                            if (confirm(`إضافة ${s.name} إلى ${sub.name}؟`)) {
                              try {
                                const payments = { ...(s.payments || {}) };
                                payments[sub.id] = {};
                                for (let m = 0; m <= CM; m++) {
                                  payments[sub.id][mk(CY, m)] = { paid: false, paidDate: null };
                                }
                                await updateDoc(doc(db, 'students', s.id), { payments });
                                toast(`✅ تمت إضافة ${sub.name}`, 'success');
                              } catch (e) {
                                console.error(e);
                                toast('خطأ', 'error');
                              }
                            }
                          }
                        }
                      }}
                    >➕</button>
                    <button className="btn bgh sm" style={{ padding:'5px 9px' }} onClick={()=>openEdit(s)}>✏️</button>
                    <button className="btn bgh sm" style={{ padding:'5px 9px', color:'var(--er)' }} onClick={()=>del(s.id)}>🗑️</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign:'center', padding:40, color:'var(--mu)' }}>
          <div style={{ fontSize:44 }}>🔍</div><div style={{ marginTop:10 }}>لا توجد نتائج</div>
        </div>
      )}

      <Modal open={!!modal} close={()=>setModal(null)} title={modal==='add'?'إضافة طالب جديد':'تعديل بيانات الطالب'} size={600}
        footer={
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn bp wf" onClick={save}>💾 حفظ</button>
            <button className="btn bgh wf" onClick={()=>setModal(null)}>إلغاء</button>
          </div>
        }>
        <div className="fg"><label className="fl">الاسم الكامل</label><input className="inp" placeholder="اسم الطالب" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
        <div className="fg"><label className="fl">الصف الدراسي</label>
          <select className="inp" value={form.grade} onChange={e=>{
            setForm({...form,grade:e.target.value});
            setSelectedSubjects([]);
          }}>
            <option value="">اختر الصف</option>
            {GRADES.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div className="fg"><label className="fl">رقم الهاتف</label><input className="inp" placeholder="01000000000" value={form.phone||''} onChange={e=>setForm({...form,phone:e.target.value})}/></div>
        <div className="fg"><label className="fl">البريد الإلكتروني</label><input className="inp" type="email" placeholder="example@email.com" value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})}/></div>
        
        {modal === 'add' && form.grade && (
          <div className="fg">
            <label className="fl">📚 اختر المواد ({selectedSubjects.length})</label>
            {availableSubjects.length === 0 ? (
              <div style={{ fontSize:12, color:'var(--mu)', padding:8 }}>لا توجد مواد لهذا الصف</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:5, maxHeight:220, overflowY:'auto' }}>
                {availableSubjects.map(sub => {
                  const t = teachers.find(x => x.id === sub.teacher);
                  const sel = selectedSubjects.includes(sub.id);
                  return (
                    <div 
                      key={sub.id}
                      onClick={() => toggleSubject(sub.id)}
                      style={{
                        display:'flex', alignItems:'center', gap:8, padding:'8px 10px',
                        borderRadius:8, cursor:'pointer',
                        border:`2px solid ${sel ? 'var(--pr)' : 'var(--bd)'}`,
                        background: sel ? 'var(--pr-l)' : '#fff'
                      }}
                    >
                      <span style={{ fontSize:18 }}>{sub.emoji}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:600, fontSize:12 }}>{sub.name}</div>
                        <div style={{ fontSize:10, color:'var(--mu)' }}>👨‍🏫 {t?.name||'—'} · 💰 {sub.fee} ج.م</div>
                      </div>
                      <div style={{
                        width:20, height:20, borderRadius:4,
                        border:`2px solid ${sel ? 'var(--pr)' : '#ccc'}`,
                        background: sel ? 'var(--pr)' : '#fff',
                        color:'#fff', fontSize:11, fontWeight:700,
                        display:'flex', alignItems:'center', justifyContent:'center'
                      }}>
                        {sel ? '✓' : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ADMIN TEACHERS
══════════════════════════════════════════════════════════ */
function AdminTeachers() {
  const { teachers, setTeachers, toast } = useApp();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({name:'',subject:'',phone:'',email:'',avatar:'👨‍🏫',color:'g1',pass:''});
  const [editId, setEditId] = useState(null);
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetModal, setResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const avs = ['👨‍🏫','👩‍🏫','👨‍🔬','👩‍🔬','👨‍💼','👩‍💼','👨‍🎓','👩‍🎓','👨‍💻','👩‍💻'];
  const cols = ['g1','g2','g3','g4','g5','g6','g7'];

  const openAdd = () => { 
    setForm({name:'',subject:'',phone:'',email:'',avatar:'👨‍🏫',color:'g1',pass:''}); 
    setEditId(null); 
    setShowPass(false);
    setModal(true); 
  };
  
  const openEdit = t => { 
    setForm({...t, pass: ''}); 
    setEditId(t.id); 
    setShowPass(false);
    setModal(true); 
  };

  const save = async () => {
    if(!form.name.trim() || !form.subject.trim() || !form.email.trim()) {
      toast('يرجى ملء الاسم والتخصص والبريد الإلكتروني','error');
      return;
    }
    
    setSaving(true);
    
    try {
      if (editId) {
        const { pass, ...updateData } = form;
        await updateDoc(doc(db, 'teachers', editId), updateData);
        toast('تم تحديث المعلم ✅','success');
      } else {
        if (!form.pass || form.pass.length < 6) {
          toast('كلمة المرور يجب أن تكون 6 أحرف على الأقل','error');
          setSaving(false);
          return;
        }
        
        let uid;
        try {
          const userCred = await createUserWithEmailAndPassword(auth, form.email.trim(), form.pass);
          uid = userCred.user.uid;
        } catch (authError) {
          console.error('Auth error:', authError);
          if (authError.code === 'auth/email-already-in-use') {
            toast('هذا البريد مستخدم بالفعل. الرجاء استخدام بريد آخر.','error');
          } else if (authError.code === 'auth/invalid-email') {
            toast('صيغة البريد الإلكتروني غير صحيحة','error');
          } else {
            toast('خطأ في إنشاء الحساب: ' + authError.message,'error');
          }
          setSaving(false);
          return;
        }
        
        await setDoc(doc(db, 'users', uid), {
          uid: uid,
          name: form.name.trim(),
          email: form.email.trim(),
          role: 'teacher',
          status: 'approved',
          createdAt: new Date().toISOString(),
        });
        
        await addDoc(collection(db, 'teachers'), {
          uid: uid,
          name: form.name.trim(),
          subject: form.subject.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          avatar: form.avatar,
          color: form.color,
        });
        
        toast('✅ تم إضافة المعلم بنجاح! يمكنه تسجيل الدخول الآن.','success');
      }
      
      setModal(false);
    } catch(e) { 
      console.error('Save error:', e); 
      toast('خطأ في الحفظ: ' + (e.message || 'غير معروف'),'error');
    } finally {
      setSaving(false);
    }
  };

  const del = async (t) => {
    if(!confirm(`حذف المعلم ${t.name}؟`)) return;
    try { 
      await deleteDoc(doc(db, 'teachers', t.id)); 
      toast('تم الحذف','warning'); 
    } catch(e) { 
      console.error(e); 
      toast('خطأ في الحذف','error');
    }
  };

  const resetPassword = async () => {
    if (!resetEmail.trim()) {
      toast('يرجى إدخال البريد الإلكتروني','error');
      return;
    }
    setSaving(true);
    try {
      const { sendPasswordResetEmail } = await import("firebase/auth");
      await sendPasswordResetEmail(auth, resetEmail.trim());
      toast('✅ تم إرسال رابط إعادة تعيين كلمة المرور إلى البريد الإلكتروني','success');
      setResetModal(false);
      setResetEmail('');
    } catch(e) {
      console.error(e);
      if (e.code === 'auth/user-not-found') {
        toast('لا يوجد حساب بهذا البريد الإلكتروني','error');
      } else {
        toast('خطأ: ' + (e.message || 'غير معروف'),'error');
      }
    }
    setSaving(false);
  };

  return (
    <div style={{ animation:'fadeIn .5s ease' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
        <div>
          <div style={{ fontSize:20, fontWeight:800 }}>👩‍🏫 إدارة المعلمين</div>
          <div style={{ fontSize:13, color:'var(--mu)', marginTop:2 }}>{teachers.length} معلم</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn bgh sm" onClick={() => setResetModal(true)}>🔑 كلمة المرور</button>
          <button className="btn bp sm" onClick={openAdd}>➕ إضافة</button>
        </div>
      </div>
      
      <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
        {teachers.map((t,i)=>(
          <div key={t.id} className="card" style={{ padding:'14px', borderRadius:'var(--rx)', animationDelay:`${i*.07}s`, animation:'fadeIn .5s ease forwards', opacity:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:11 }}>
              <div className={t.color} style={{ width:48, height:48, borderRadius:13, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>{t.avatar}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:800, fontSize:15 }}>{t.name}</div>
                <div style={{ color:'var(--mu)', fontSize:12 }}>{t.subject}</div>
                <div style={{ fontSize:11, color:'var(--li)' }}>📞 {t.phone} | 📧 {t.email}</div>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <button className="btn bgh sm" onClick={()=>openEdit(t)}>✏️</button>
                <button className="btn bgh sm" style={{ color:'var(--er)' }} onClick={()=>del(t)}>🗑️</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <Modal open={modal} close={()=>!saving && setModal(false)} title={editId?'تعديل بيانات المعلم':'إضافة معلم جديد'}
        footer={
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn bp wf" onClick={save} disabled={saving}>
              {saving ? '⏳ جاري...' : '💾 حفظ'}
            </button>
            <button className="btn bgh wf" onClick={()=>setModal(false)} disabled={saving}>إلغاء</button>
          </div>
        }>
        <div className="fg"><label className="fl">الاسم الكامل *</label><input className="inp" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="اسم المعلم"/></div>
        <div className="fg"><label className="fl">التخصص / المادة *</label><input className="inp" value={form.subject} onChange={e=>setForm(p=>({...p,subject:e.target.value}))} placeholder="مثلاً: الرياضيات"/></div>
        <div className="fg"><label className="fl">رقم الهاتف</label><input className="inp" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} placeholder="01000000000"/></div>
        <div className="fg"><label className="fl">البريد الإلكتروني *</label><input className="inp" type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} placeholder="teacher@example.com"/></div>
        
        {!editId && (
          <>
            <div className="fg">
              <label className="fl">كلمة المرور 🔑 *</label>
              <div style={{ position:'relative' }}>
                <input 
                  type={showPass?'text':'password'} 
                  className="inp" 
                  style={{ paddingLeft:40 }} 
                  placeholder="أدخل كلمة مرور (6 أحرف على الأقل)" 
                  value={form.pass} 
                  onChange={e=>setForm(p=>({...p,pass:e.target.value}))}
                />
                <button type="button" onClick={()=>setShowPass(x=>!x)} 
                  style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:15 }}>
                  {showPass?'🙈':'👁️'}
                </button>
              </div>
            </div>
            <div style={{ marginBottom:16, padding:'10px 13px', background:'var(--wa-l)', borderRadius:'var(--r)', fontSize:11, color:'#92400e', fontWeight:600 }}>
              ⚠️ سيتم إنشاء حساب تسجيل دخول للمعلم تلقائياً في Firebase Authentication
            </div>
          </>
        )}
        
        {editId && (
          <div style={{ marginBottom:16, padding:'10px 13px', background:'var(--pr-l)', borderRadius:'var(--r)', fontSize:11, color:'#4c1d95', fontWeight:600 }}>
            ℹ️ لتغيير كلمة المرور، استخدم زر "🔑 كلمة المرور" في الأعلى.
          </div>
        )}
        
        <div className="fg"><label className="fl">الأيقونة</label>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {avs.map(av=><button key={av} type="button" onClick={()=>setForm(p=>({...p,avatar:av}))} style={{ width:38, height:38, fontSize:20, border:`2px solid ${form.avatar===av?'var(--pr)':'var(--bd)'}`, borderRadius:9, background:form.avatar===av?'var(--pr-l)':'#fff', cursor:'pointer' }}>{av}</button>)}
          </div>
        </div>
        <div className="fg"><label className="fl">اللون</label>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {cols.map(c=><div key={c} onClick={()=>setForm(p=>({...p,color:c}))} className={c} style={{ width:34, height:34, borderRadius:8, cursor:'pointer', outline:form.color===c?'3px solid var(--pr)':'none', outlineOffset:2 }}></div>)}
          </div>
        </div>
      </Modal>

      <Modal open={resetModal} close={() => setResetModal(false)} title="🔑 إعادة تعيين كلمة المرور"
        footer={
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn bp wf" onClick={resetPassword} disabled={saving}>
              {saving ? '⏳ جاري...' : '📧 إرسال الرابط'}
            </button>
            <button className="btn bgh wf" onClick={() => setResetModal(false)}>إلغاء</button>
          </div>
        }>
        <p style={{ fontSize:13, color:'var(--mu)', marginBottom:14 }}>
          أدخل البريد الإلكتروني للمعلم لإرسال رابط إعادة تعيين كلمة المرور.
        </p>
        <div className="fg">
          <label className="fl">البريد الإلكتروني</label>
          <input className="inp" type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} placeholder="teacher@example.com" />
        </div>
      </Modal>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ADMIN SUBJECTS
══════════════════════════════════════════════════════════ */
function AdminSubjects() {
  const { subjects, setSubjects, teachers, toast } = useApp();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({name:'',grade:'',teacher:'',emoji:'📐',color:'g1',fee:200,desc:''});
  const [editId, setEditId] = useState(null);
  const [gf, setGf] = useState('');
  const emojis = ['📐','🔬','📖','🌍','🎨','⚽','💻','🎵','🔭','📝','🧮','🏛️','⚗️','🌱','🗺️','🌙'];
  const cols = ['g1','g2','g3','g4','g5','g6','g7'];
  const filtered = subjects.filter(s=>!gf||s.grade===gf);

  const openAdd = () => { setForm({name:'',grade:'',teacher:'',emoji:'📐',color:'g1',fee:200,desc:''}); setEditId(null); setModal(true); };
  const openEdit = s => { setForm({...s}); setEditId(s.id); setModal(true); };

  const save = async () => {
    if(!form.name.trim()||!form.grade||!form.teacher){toast('يرجى ملء الحقول الأساسية','error');return;}
    try {
      if(editId){
        await updateDoc(doc(db,'subjects',editId),{...form});
        toast('تم التحديث ✅','success');
      } else {
        await addDoc(collection(db,'subjects'),{...form});
        toast('تم إضافة المادة ✅','success');
      }
      setModal(false);
    } catch(e){ console.error(e); toast('خطأ في الحفظ','error'); }
  };

  const del = async id => {
    if(!confirm('حذف هذه المادة؟'))return;
    try { await deleteDoc(doc(db,'subjects',id)); toast('تم الحذف','warning'); }
    catch(e){ console.error(e); }
  };

  return (
    <div style={{ animation:'fadeIn .5s ease' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
        <div><div style={{ fontSize:20, fontWeight:800 }}>📚 إدارة المواد</div><div style={{ fontSize:13, color:'var(--mu)', marginTop:2 }}>{filtered.length} مادة</div></div>
        <button className="btn bp sm" onClick={openAdd}>➕ إضافة</button>
      </div>
      <div className="card" style={{ padding:'11px 13px', marginBottom:13, borderRadius:'var(--rl)' }}>
        <select className="inp" style={{ fontSize:13 }} value={gf} onChange={e=>setGf(e.target.value)}>
          <option value="">كل الصفوف</option>{GRADES.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 }}>
        {filtered.map((sub,i)=>{
          const t = teachers.find(x=>x.id===sub.teacher);
          const g = GRADES.find(x=>x.id===sub.grade);
          return (
            <div key={sub.id} className="card ch" style={{ borderRadius:'var(--rx)', overflow:'hidden', animationDelay:`${i*.06}s`, animation:'fadeIn .5s ease forwards', opacity:0 }}>
              <div className={sub.color} style={{ height:70, display:'flex', alignItems:'center', justifyContent:'center', fontSize:34 }}>{sub.emoji}</div>
              <div style={{ padding:'10px 12px' }}>
                <div style={{ fontWeight:800, fontSize:13, marginBottom:2 }}>{sub.name}</div>
                <div style={{ fontSize:10, color:'var(--mu)', marginBottom:2 }}>{g?.name}</div>
                <div style={{ fontSize:11, color:'var(--mu)', marginBottom:1 }}>👨‍🏫 {t?.name||'—'}</div>
                <div style={{ fontSize:11, color:'var(--pr)', fontWeight:700, marginBottom:9 }}>💰 {sub.fee} ج.م</div>
                <div style={{ display:'flex', gap:5 }}>
                  <button className="btn bol sm" style={{ flex:1, fontSize:10, padding:'5px 8px' }} onClick={()=>openEdit(sub)}>✏️</button>
                  <button className="btn sm" style={{ background:'var(--er-l)', color:'var(--er)', border:'none', padding:'5px 8px', fontSize:10, borderRadius:'var(--r)', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }} onClick={()=>del(sub.id)}>🗑️</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <Modal open={modal} close={()=>setModal(false)} title={editId?'تعديل المادة':'إضافة مادة جديدة'}
        footer={<><button className="btn bp wf" onClick={save}>💾 حفظ</button><button className="btn bgh wf" onClick={()=>setModal(false)}>إلغاء</button></>}>
        <div className="fg"><label className="fl">اسم المادة</label><input className="inp" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/></div>
        <div className="fg"><label className="fl">القسط الشهري (ج.م)</label><input type="number" className="inp" value={form.fee} onChange={e=>setForm(p=>({...p,fee:+e.target.value}))}/></div>
        <div className="fg"><label className="fl">الصف</label>
          <select className="inp" value={form.grade} onChange={e=>setForm(p=>({...p,grade:e.target.value}))}>
            <option value="">-- اختر --</option>{GRADES.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
          </select></div>
        <div className="fg"><label className="fl">المعلم</label>
          <select className="inp" value={form.teacher} onChange={e=>setForm(p=>({...p,teacher:e.target.value}))}>
            <option value="">-- اختر --</option>{teachers.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
          </select></div>
        <div className="fg"><label className="fl">وصف المادة</label><input className="inp" value={form.desc} onChange={e=>setForm(p=>({...p,desc:e.target.value}))}/></div>
        <div className="fg"><label className="fl">الأيقونة</label>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {emojis.map(em=><button key={em} onClick={()=>setForm(p=>({...p,emoji:em}))} style={{ width:36, height:36, fontSize:18, border:`2px solid ${form.emoji===em?'var(--pr)':'var(--bd)'}`, borderRadius:8, background:form.emoji===em?'var(--pr-l)':'#fff', cursor:'pointer' }}>{em}</button>)}
          </div>
        </div>
        <div className="fg"><label className="fl">اللون</label>
          <div style={{ display:'flex', gap:6 }}>
            {cols.map(c=><div key={c} onClick={()=>setForm(p=>({...p,color:c}))} className={c} style={{ width:32, height:32, borderRadius:7, cursor:'pointer', outline:form.color===c?'3px solid var(--pr)':'none', outlineOffset:2 }}></div>)}
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ADMIN ANNOUNCEMENTS
══════════════════════════════════════════════════════════ */
function AdminAnn() {
  const { announcements, setAnnouncements, toast } = useApp();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({title:'',content:'',date:today(),type:'info'});
  const [editId, setEditId] = useState(null);
  const tc = {info:['var(--pr-l)','var(--pr)'],warning:['var(--wa-l)','#78350f'],success:['var(--ok-l)','#065f46'],danger:['var(--er-l)','#7f1d1d']};
  const tl = {info:'📘 معلومة',warning:'⚠️ تحذير',success:'✅ إشعار',danger:'🚨 عاجل'};

  const openAdd = () => { setForm({title:'',content:'',date:today(),type:'info'}); setEditId(null); setModal(true); };
  const openEdit = a => { setForm({...a}); setEditId(a.id); setModal(true); };

  const save = async () => {
    if(!form.title.trim()||!form.content.trim()){toast('يرجى ملء الحقول','error');return;}
    try {
      if(editId){
        await updateDoc(doc(db,'announcements',editId),{...form});
        toast('تم التحديث ✅','success');
      } else {
        await addDoc(collection(db,'announcements'),{...form});
        toast('تم النشر ✅','success');
      }
      setModal(false);
    } catch(e){ console.error(e); toast('خطأ في الحفظ','error'); }
  };

  const del = async id => {
    try { await deleteDoc(doc(db,'announcements',id)); toast('تم الحذف','warning'); }
    catch(e){ console.error(e); }
  };

  return (
    <div style={{ animation:'fadeIn .5s ease' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
        <div><div style={{ fontSize:20, fontWeight:800 }}>📢 إدارة الإعلانات</div></div>
        <button className="btn bp sm" onClick={openAdd}>➕ إضافة</button>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {announcements.map((a,i)=>{
          const [bg,co] = tc[a.type]||tc.info;
          return (
            <div key={a.id} className="card" style={{ padding:'13px 14px', borderRadius:'var(--rx)', borderRight:`4px solid ${co}`, animationDelay:`${i*.08}s`, animation:'fadeIn .5s ease forwards', opacity:0 }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:9 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
                    <span className="badge" style={{ background:bg, color:co, fontSize:10 }}>{tl[a.type]}</span>
                    <span style={{ fontSize:11, color:'var(--li)' }}>{a.date}</span>
                  </div>
                  <div style={{ fontSize:14, fontWeight:800, marginBottom:3 }}>{a.title}</div>
                  <div style={{ fontSize:12, color:'var(--mu)', lineHeight:1.7 }}>{a.content}</div>
                </div>
                <div style={{ display:'flex', gap:5, flexShrink:0 }}>
                  <button className="btn bgh sm" style={{ padding:'5px 9px' }} onClick={()=>openEdit(a)}>✏️</button>
                  <button className="btn bgh sm" style={{ padding:'5px 9px', color:'var(--er)' }} onClick={()=>del(a.id)}>🗑️</button>
                </div>
              </div>
            </div>
          );
        })}
        {!announcements.length && <div style={{ textAlign:'center', padding:44, color:'var(--mu)' }}><div style={{ fontSize:44 }}>📭</div><div style={{ marginTop:8 }}>لا توجد إعلانات</div></div>}
      </div>
      <Modal open={modal} close={()=>setModal(false)} title={editId?'تعديل الإعلان':'إعلان جديد'}
        footer={<><button className="btn bp wf" onClick={save}>📢 نشر</button><button className="btn bgh wf" onClick={()=>setModal(false)}>إلغاء</button></>}>
        <div className="fg"><label className="fl">عنوان الإعلان</label><input className="inp" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))}/></div>
        <div className="fg"><label className="fl">المحتوى</label><textarea className="inp" rows={4} value={form.content} onChange={e=>setForm(p=>({...p,content:e.target.value}))} style={{ resize:'vertical' }}></textarea></div>
        <div className="fg"><label className="fl">التاريخ</label><input type="date" className="inp" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/></div>
        <div className="fg"><label className="fl">النوع</label>
          <select className="inp" value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}>
            <option value="info">📘 معلومة</option><option value="warning">⚠️ تحذير</option>
            <option value="success">✅ إشعار</option><option value="danger">🚨 عاجل</option>
          </select></div>
      </Modal>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ROOM SCHEDULE
══════════════════════════════════════════════════════════ */
function RoomSchedule() {
  const { teachers, subjects, toast } = useApp();
  const [rooms, setRooms] = useState([
    { id: 'r1', name: 'قاعة مكيفة', capacity: 20 },
    { id: 'r2', name: 'قاعة عادية', capacity: 15 },
    { id: 'r3', name: 'قاعة صغيرة', capacity: 12 },
  ]);
  
  const days = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
  const hours = ['8-9', '9-10', '10-11', '11-12', '12-1', '1-2', '2-3', '3-4', '4-5', '5-6', '6-7', '7-8'];
  
  const [schedule, setSchedule] = useState({});
  const [selectedDay, setSelectedDay] = useState('السبت');
  const [selectedRoom, setSelectedRoom] = useState('r1');
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ teacher: '', subject: '', status: 'available' });
  const [selectedHour, setSelectedHour] = useState(null);

  useEffect(() => {
    getDoc(doc(db, 'settings', 'roomSchedule')).then(docSnap => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.schedule) setSchedule(data.schedule);
        if (data.rooms) setRooms(data.rooms);
      }
    }).catch(() => {});
  }, []);

  const saveToFirestore = async (newSchedule, newRooms) => {
    try {
      await setDoc(doc(db, 'settings', 'roomSchedule'), {
        schedule: newSchedule || schedule,
        rooms: newRooms || rooms,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      toast('خطأ في الحفظ', 'error');
    }
  };

  const addRoom = async () => {
    const name = prompt('اسم القاعة الجديدة:');
    if (!name) return;
    const capacity = prompt('السعة (عدد الطلاب):', '30');
    if (!capacity) return;
    const newRooms = [...rooms, { id: 'r' + Date.now(), name, capacity: +capacity }];
    setRooms(newRooms);
    await saveToFirestore(schedule, newRooms);
    toast('✅ تمت إضافة القاعة', 'success');
  };

  const openEdit = (hour) => {
    const key = `${selectedRoom}-${selectedDay}-${hour}`;
    setSelectedHour(hour);
    setEditForm(schedule[key] || { teacher: '', subject: '', status: 'available' });
    setEditModal(true);
  };

  const saveCell = async () => {
    if (!selectedHour) return;
    const key = `${selectedRoom}-${selectedDay}-${selectedHour}`;
    const updated = { ...schedule };
    if (editForm.status === 'available') {
      delete updated[key];
    } else {
      updated[key] = { ...editForm };
    }
    setSchedule(updated);
    setEditModal(false);
    await saveToFirestore(updated, rooms);
    toast('✅ تم التحديث', 'success');
  };

  const deleteAll = async () => {
    if (!confirm('مسح كامل الجدول لجميع القاعات؟')) return;
    setSchedule({});
    await saveToFirestore({}, rooms);
    toast('تم مسح الجدول', 'warning');
  };

  const room = rooms.find(r => r.id === selectedRoom);
  const busyCount = hours.filter(hour => {
    const key = `${selectedRoom}-${selectedDay}-${hour}`;
    return schedule[key]?.status === 'busy';
  }).length;

  return (
    <div style={{ animation: 'fadeIn .5s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 19, fontWeight: 800 }}>🏫 جدول القاعات</div>
          <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 2 }}>{rooms.length} قاعات</div>
        </div>
        <button className="btn bp sm" style={{ fontSize: 11, padding: '5px 12px' }} onClick={addRoom}>➕</button>
      </div>

      {/* اختيار القاعة */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, overflowX: 'auto', paddingBottom: 4 }}>
        {rooms.map(r => (
          <button
            key={r.id}
            onClick={() => setSelectedRoom(r.id)}
            style={{
              padding: '7px 14px',
              borderRadius: 20,
              border: `2px solid ${selectedRoom === r.id ? 'var(--pr)' : 'var(--bd)'}`,
              background: selectedRoom === r.id ? 'var(--pr)' : '#fff',
              color: selectedRoom === r.id ? '#fff' : 'var(--tx)',
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            {r.name}
          </button>
        ))}
      </div>

      {/* اختيار اليوم */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12, overflowX: 'auto', paddingBottom: 4 }}>
        {days.map(day => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            style={{
              padding: '5px 10px',
              borderRadius: 14,
              border: `1px solid ${selectedDay === day ? 'var(--se)' : 'var(--bd)'}`,
              background: selectedDay === day ? '#eef2ff' : '#fff',
              color: selectedDay === day ? 'var(--se)' : 'var(--mu)',
              fontWeight: 600,
              fontSize: 10,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            {day}
          </button>
        ))}
      </div>

      {/* ملخص */}
      <div style={{ 
        background: 'linear-gradient(135deg,#1e3a8a,#3b82f6)', 
        borderRadius: 12, 
        padding: '12px 14px', 
        color: '#fff', 
        marginBottom: 12,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 13 }}>{room?.name} - {selectedDay}</div>
          <div style={{ fontSize: 10, opacity: .8 }}>🪑 {room?.capacity} | 📚 {busyCount}/{hours.length} محجوز</div>
        </div>
        <button className="btn bgh sm" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)', fontSize: 10, padding: '4px 10px' }} onClick={deleteAll}>🗑️ مسح</button>
      </div>

      {/* الحصص */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {hours.map((hour, hourIdx) => {
          const key = `${selectedRoom}-${selectedDay}-${hour}`;
          const cell = schedule[key];
          const isAvailable = !cell || cell.status === 'available';
          const isBusy = cell?.status === 'busy';
          const isBreak = cell?.status === 'break';
          
          return (
            <div
              key={hour}
              onClick={() => openEdit(hour)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 10,
                cursor: 'pointer',
                border: `2px solid ${isAvailable ? '#d1fae5' : isBusy ? '#fecaca' : '#fef3c7'}`,
                background: isAvailable ? '#f0fdf4' : isBusy ? '#fff5f5' : '#fffbeb'
              }}
            >
              <div style={{ 
                fontWeight: 700, 
                fontSize: 11, 
                color: 'var(--mu)',
                minWidth: 45,
                textAlign: 'center'
              }}>
                {hour.replace('-', ' - ')}
                <div style={{ fontSize: 8, opacity: .5 }}>{hourIdx < 4 ? 'ص' : 'م'}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {isAvailable && <span style={{ color: '#16a34a', fontSize: 12 }}>✅ متاح</span>}
                {isBusy && (
                  <>
                    <div style={{ fontWeight: 700, fontSize: 12, color: '#dc2626' }}>{cell.teacher}</div>
                    <div style={{ fontSize: 10, color: '#991b1b' }}>{cell.subject}</div>
                  </>
                )}
                {isBreak && <span style={{ color: '#92400e', fontSize: 12 }}>⏸️ استراحة</span>}
              </div>
              <span style={{ color: 'var(--li)', fontSize: 16 }}>›</span>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 12, display: 'flex', gap: 12, fontSize: 10, color: 'var(--mu)', justifyContent: 'center' }}>
        <span>🟢 متاح</span>
        <span>🔴 محجوز</span>
        <span>🟡 استراحة</span>
      </div>

      <Modal open={editModal} close={() => setEditModal(false)} title={`✏️ ${selectedDay} | ${selectedHour?.replace('-', ' - ') || ''}`}
        footer={<><button className="btn bp wf" onClick={saveCell}>💾 حفظ</button><button className="btn bgh wf" onClick={() => setEditModal(false)}>إلغاء</button></>}>
        <div className="fg"><label className="fl">الحالة</label>
          <select className="inp" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
            <option value="available">✅ متاح</option>
            <option value="busy">❌ محجوز</option>
            <option value="break">⏸️ استراحة</option>
          </select>
        </div>
        {editForm.status === 'busy' && (
          <>
            <div className="fg"><label className="fl">المعلم</label>
              <select className="inp" value={editForm.teacher} onChange={e => setEditForm({ ...editForm, teacher: e.target.value })}>
                <option value="">-- اختر --</option>
                {teachers.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
            </div>
            <div className="fg"><label className="fl">المادة</label>
              <select className="inp" value={editForm.subject} onChange={e => setEditForm({ ...editForm, subject: e.target.value })}>
                <option value="">-- اختر --</option>
                {subjects.filter(s => editForm.teacher && teachers.find(t => t.name === editForm.teacher)?.id === s.teacher).map(s => <option key={s.id} value={s.name}>{s.emoji} {s.name}</option>)}
              </select>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
/* ══════════════════════════════════════════════════════════
   TEACHER DASHBOARD
══════════════════════════════════════════════════════════ */
function TeacherDash({ user }) {
  const { teachers, subjects, students, pendingStudents, setPendingStudents, setStudents, toast } = useApp();
  const teacher = teachers.find(t=>t.id===user.tid);
  const mySubs = subjects.filter(s=>s.teacher===user.tid);
  const k = mk(CY,CM);
  const [tab, setTab] = useState('subs');
  const [gradesSubject, setGradesSubject] = useState(null);
  const [chatOpen, setChatOpen] = useState(null);
  const myGrades = [...new Set(mySubs.map(s=>s.grade))];
  const myPending = pendingStudents.filter(p=>myGrades.includes(p.grade));

  const approve = async req => {
    const subs = subjects.filter(s=>s.grade===req.grade);
    const payments = {};
    subs.forEach(sub=>{
      payments[sub.id]={};
      for(let m=0;m<=CM;m++) payments[sub.id][mk(CY,m)]={paid:false,paidDate:null};
    });
    
    const sid = req.uid;
    const newStudent = { 
      id: sid, 
      name: req.name, 
      grade: req.grade, 
      phone: req.phone, 
      email: req.email, 
      status: 'approved', 
      registeredAt: today(), 
      payments 
    };
    
    try {
      await setDoc(doc(db, 'students', sid), newStudent);
      await updateDoc(doc(db, 'users', req.uid), {
        role: 'student',
        status: 'approved',
        studentId: sid
      });
      await deleteDoc(doc(db, 'pendingStudents', req.id));
      toast(`✅ تم قبول تسجيل ${req.name}`, 'success');
    } catch(e) { 
      console.error('Error approving student:', e);
      toast('حدث خطأ أثناء الموافقة', 'error');
    }
  };

  const reject = async req => {
    if(!confirm(`رفض طلب ${req.name}؟`)) return;
    try {
      await updateDoc(doc(db, 'users', req.uid), {
        status: 'rejected',
        role: 'student_pending'
      });
      await deleteDoc(doc(db, 'pendingStudents', req.id));
      toast(`تم رفض طلب ${req.name}`, 'warning');
    } catch(e) { 
      console.error('Error rejecting student:', e);
      toast('حدث خطأ أثناء الرفض', 'error');
    }
  };

  if(!teacher) return <div style={{ padding:40, textAlign:'center' }}>لم يُعثر على بيانات المعلم</div>;

  return (
    <div style={{ animation:'fadeIn .5s ease' }}>
      <div style={{ background:'linear-gradient(135deg,#1e3a8a,#3b82f6,#8b5cf6)', borderRadius:'var(--rx)', padding:'18px 16px', marginBottom:16, color:'#fff', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-30, left:-30, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,.07)' }}></div>
        <div style={{ display:'flex', alignItems:'center', gap:12, position:'relative' }}>
          <div style={{ width:52, height:52, borderRadius:14, background:'rgba(255,255,255,.2)', border:'2px solid rgba(255,255,255,.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, flexShrink:0 }}>{teacher.avatar}</div>
          <div>
            <div style={{ fontSize:11, opacity:.75, marginBottom:2 }}>لوحة المعلم</div>
            <h1 style={{ fontSize:18, fontWeight:900 }}>{teacher.name}</h1>
            <div style={{ opacity:.8, fontSize:12 }}>مادة: {teacher.subject}</div>
          </div>
        </div>
      </div>

      {myPending.length > 0 && (
        <div style={{ background:'var(--wa-l)', border:'2px solid var(--wa)', borderRadius:'var(--rl)', padding:'12px 14px', marginBottom:14, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontWeight:700, color:'#78350f', fontSize:13 }}>⏳ {myPending.length} طلب بانتظار موافقتك</div>
          <button className="btn bwa sm" onClick={()=>setTab('pending')}>مراجعة</button>
        </div>
      )}

      <div className="tabs">
        <button className={`tab ${tab==='subs'?'ac':''}`} onClick={()=>setTab('subs')}>📚 موادي</button>
        <button className={`tab ${tab==='students'?'ac':''}`} onClick={()=>setTab('students')}>👨‍🎓 طلابي</button>
        {myPending.length > 0 && <button className={`tab ${tab==='pending'?'ac':''}`} onClick={()=>setTab('pending')}>⏳ ({myPending.length})</button>}
      </div>

      {tab==='subs' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 }}>
          {mySubs.map((sub,i)=>{
            const g = GRADES.find(x=>x.id===sub.grade);
            const sts = students.filter(s=>s.grade===sub.grade && s.payments?.[sub.id]);
            const pc = sts.filter(s=>s.payments?.[sub.id]?.[k]?.paid).length;
            return (
              <div key={sub.id} className="card ch" style={{ borderRadius:'var(--rx)', overflow:'hidden', animationDelay:`${i*.08}s`, animation:'fadeIn .5s ease forwards', opacity:0 }}>
                <div className={sub.color} style={{ height:70, display:'flex', alignItems:'center', justifyContent:'center', fontSize:34 }}>{sub.emoji}</div>
                <div style={{ padding:'11px 12px' }}>
                  <div style={{ fontWeight:800, fontSize:13 }}>{sub.name}</div>
                  <div style={{ fontSize:10, color:'var(--mu)', marginTop:2, marginBottom:6 }}>{g?.name}</div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span className="badge bpr-b" style={{ fontSize:9 }}>👨‍🎓 {sts.length}</span>
                    <span className="badge bok-b" style={{ fontSize:9 }}>✅ {pc}</span>
                  </div>
                  <div style={{ fontSize:11, color:'var(--pr)', fontWeight:700, marginBottom:8 }}>💰 {sub.fee} ج.م</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                    <button className="btn bse sm wf" style={{ fontSize:10, padding:'6px' }} onClick={()=>setGradesSubject({id:sub.id,name:sub.name,grade:sub.grade})}>📝 الدرجات</button>
                    <button style={{ fontSize:10, padding:'6px', background:'#e0f2fe', color:'#0369a1', border:'none', borderRadius:'var(--r)', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }} onClick={()=>setChatOpen({id:sub.id,name:sub.name,teacher:teacher?.name})}>💬 محادثة</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab==='students' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {mySubs.flatMap(sub=>{
            const g = GRADES.find(x=>x.id===sub.grade);
            return students.filter(s=>s.grade===sub.grade && s.payments?.[sub.id]).map(s=>{
              const mo = s.payments?.[sub.id]?.[k];
              
              const removeStudent = async () => {
                if (!confirm(`إزالة ${s.name} من مادة ${sub.name}؟`)) return;
                try {
                  const payments = { ...s.payments };
                  delete payments[sub.id];
                  await updateDoc(doc(db, 'students', s.id), { payments });
                  toast(`✅ تمت إزالة ${s.name} من ${sub.name}`, 'success');
                } catch (e) {
                  console.error(e);
                  toast('خطأ في الإزالة', 'error');
                }
              };
              
              return (
                <div key={`${sub.id}-${s.id}`} className="card" style={{ padding:'12px 14px', borderRadius:'var(--rl)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                    <div className="av" style={{ background:'var(--se-l)', color:'var(--se)', width:36, height:36, fontSize:14 }}>{s.name[0]}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:13 }}>{s.name}</div>
                      <div style={{ fontSize:11, color:'var(--mu)' }}>{g?.name} · {sub.name}</div>
                    </div>
                    <span className={`badge ${mo?.paid?'bok-b':'ber-b'}`} style={{ fontSize:10 }}>{mo?.paid?'✅ مدفوع':'❌ غير مدفوع'}</span>
                    <button 
                      onClick={removeStudent}
                      style={{
                        background:'var(--er-l)',
                        color:'var(--er)',           
                        border:'none',
                        borderRadius:'50%',
                        width:26,
                        height:26,
                        fontSize:12,
                        cursor:'pointer',
                        fontWeight:700,
                        flexShrink:0
                      }}
                      title={`إزالة من ${sub.name}`}
                    >✕</button>
                  </div>
                </div>
              );
            });
          })}
        </div>
      )}

      {tab==='pending' && (
        <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
          {myPending.map((r)=>{
            const g = GRADES.find(x=>x.id===r.grade);
            return (
              <div key={r.id} className="card" style={{ padding:'14px', borderRadius:'var(--rx)', borderRight:'4px solid var(--wa)' }}>
                <div style={{ fontWeight:800, fontSize:14 }}>{r.name}</div>
                <div style={{ color:'var(--mu)', fontSize:12, marginTop:2 }}>{g?.name}</div>
                <div style={{ fontSize:11, color:'var(--li)', marginTop:3 }}>📞 {r.phone} | 📅 {r.requestedAt}</div>
                <div style={{ display:'flex', gap:8, marginTop:11 }}>
                  <button className="btn bok wf" style={{ fontSize:13 }} onClick={()=>approve(r)}>✅ قبول</button>
                  <button className="btn ber sm" onClick={()=>reject(r)}>❌</button>
                </div>
              </div>
            );
          })}
          {!myPending.length && <div style={{ textAlign:'center', padding:36, color:'var(--mu)' }}>لا توجد طلبات معلّقة</div>}
        </div>
      )}

      {gradesSubject && (
        <GradesModal
          subject={gradesSubject}
          students={students.filter(s=>s.grade===gradesSubject.grade)}
          onClose={()=>setGradesSubject(null)}
          onSave={(subjectId,gradesData)=>{
            setStudents(students.map(s=>({...s,grades:{...s.grades,[subjectId]:gradesData[s.id]}})));
            toast('✅ تم حفظ الدرجات بنجاح','success');
          }}
        />
      )}

      {chatOpen && (
        <div className="chat-modal-overlay" onClick={()=>setChatOpen(null)}>
          <div className="chat-modal" onClick={e=>e.stopPropagation()}>
            <Chat subjectId={chatOpen.id} subjectName={chatOpen.name} teacherName={chatOpen.teacher} onClose={()=>setChatOpen(null)}/>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   APP ROOT
══════════════════════════════════════════════════════════ */
export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [page, setPage] = useState('dashboard');
  const [selSub, setSelSub] = useState(null);
  const [toasts, setToasts] = useState([]);

  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [pendingStudents, setPendingStudents] = useState([]);

  const toast = useCallback((msg, type='info') => {
    const id = Date.now();
    setToasts(p=>[...p,{id,msg,type}]);
    setTimeout(()=>{
      setToasts(p=>p.map(t=>t.id===id?{...t,ex:true}:t));
      setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),300);
    }, 3500);
  }, []);

  const removeToast = id => setToasts(p=>p.filter(t=>t.id!==id));

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "students"), snap => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "teachers"), snap => {
      setTeachers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "subjects"), snap => {
      setSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "announcements"), snap => {
      setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "pendingStudents"), snap => {
      setPendingStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async fbUser => {
      if (!fbUser) { 
        setUser(null); 
        setRole(null); 
        setLoading(false); 
        return; 
      }
      
      try {
        const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
        
        if (!userDoc.exists()) {
          await signOut(auth);
          setUser(null);
          setRole(null);
          setLoading(false);
          return;
        }
        
        const userData = userDoc.data();
        const r = userData.role || 'student';
        
        if (userData.status === 'rejected') {
          await signOut(auth);
          setUser(null);
          setRole(null);
          setLoading(false);
          toast('تم رفض طلب تسجيلك. يرجى التواصل مع الإدارة.', 'error');
          return;
        }
        
        let u = { 
          uid: fbUser.uid, 
          name: userData.name || fbUser.displayName || '', 
          email: fbUser.email 
        };

        if (r === 'student' || r === 'student_pending') {
          const studentDoc = await getDoc(doc(db, 'students', fbUser.uid));
          
          if (studentDoc.exists()) {
            const studentData = studentDoc.data();
            if (studentData.status === 'approved') {
              u = { 
                ...u, 
                sid: studentDoc.id, 
                grade: studentData.grade 
              };
              if (r === 'student_pending') {
                setRole('student');
              } else {
                setRole(r);
              }
            } else {
              setRole('student_pending');
            }
          } else {
            setRole('student_pending');
          }
        } else if (r === 'teacher') {
          const lt = teachers.find(t => t.email === fbUser.email);
          if (lt) u = { ...u, tid: lt.id };
          setRole(r);
        } else {
          setRole(r);
        }
        
        setUser(u);
      } catch (e) { 
        console.error('Firestore error:', e); 
        setUser(null); 
        setRole(null); 
      }
      setLoading(false);
    });
    
    return () => unsub();
  }, [students, teachers]);

  const logout = async () => {
    await signOut(auth);
    setUser(null); 
    setRole(null); 
    setPage('dashboard'); 
    setSelSub(null);
  };

  const ctx = {
    user, role, page, setPage, selSub, setSelSub,
    students, setStudents, teachers, setTeachers,
    subjects, setSubjects, announcements, setAnnouncements,
    pendingStudents, setPendingStudents, logout, toast
  };

  const navItems = role === 'admin' ? [
    { id:'dashboard', label:'الرئيسية', icon:'🏠' },
    { id:'students', label:'الطلاب', icon:'👨‍🎓' },
    { id:'teachers', label:'المعلمين', icon:'👩‍🏫' },
    { id:'subjects', label:'المواد', icon:'📚' },
    { id:'payments', label:'الأقساط', icon:'💰' },
    { id:'reports', label:'التقارير', icon:'📊' },
    { id:'announcements', label:'الإعلانات', icon:'📢' },
    { id:'pending', label:'الطلبات', icon:'⏳' },
    { id:'rooms', label:'القاعات', icon:'🏫' },
  ] : [
    { id:'dashboard', label:'لوحتي', icon:'🏠' }
  ];

  function renderPage() {
    if (page === 'dashboard') {
      if (role === 'admin') return <AdminOverview />;
      if (role === 'teacher') return <TeacherDash user={user} />;
      return <StudentDash user={user} />;
    }
    if (page === 'pending') return <PendingReg />;
    if (page === 'payments') return <AdminPayments />;
    if (page === 'reports') return <PayReports />;
    if (page === 'students') return <AdminStudents />;
    if (page === 'teachers') return <AdminTeachers />;
    if (page === 'subjects') return <AdminSubjects />;
    if (page === 'announcements') return <AdminAnn />;
    if (page === 'rooms') return <RoomSchedule />;
    if (page === 'subjectDetail' && selSub) return <SubjectDetail sub={selSub} onBack={() => setPage('dashboard')} />;
    return <AdminOverview />;
  }

  if (loading) return <Loading />;

  if (!role)
    return (
      <Ctx.Provider value={ctx}>
        <Login />
        <Toasts list={toasts} remove={removeToast} />
      </Ctx.Provider>
    );

  if (role === 'student_pending')
    return (
      <Ctx.Provider value={ctx}>
        <PendingScreen logout={logout} />
        <Toasts list={toasts} remove={removeToast} />
      </Ctx.Provider>
    );

  return (
    <Ctx.Provider value={ctx}>
      <Sidebar
        nav={navItems}
        cur={page}
        go={p => { setPage(p); setSelSub(null); }}
        user={{ ...user, role }}
        logout={logout}
      />
      <div className="main">{renderPage()}</div>
      <Toasts list={toasts} remove={removeToast} />
    </Ctx.Provider>
  );
}
