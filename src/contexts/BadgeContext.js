import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase/firebaseConfig';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { startOfDay, differenceInDays } from 'date-fns';

const BadgeContext = createContext();

export const useBadge = () => useContext(BadgeContext);

export const BadgeProvider = ({ children }) => {
  const [badgeCount, setBadgeCount] = useState(0);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setBadgeCount(0);
      return;
    }

    let unreadNotify = 0;
    let expiredInv = 0;
    let pendingAdmin = 0;

    const updateBadge = () => {
      const sum = unreadNotify + expiredInv + pendingAdmin;
      setBadgeCount(sum);
    };

    // A. Thông báo chưa đọc
    const qNotify = query(
      collection(db, 'notification'), 
      where('email', '==', user.email), 
      where('isRead', '==', false)
    );
    const unsubNotify = onSnapshot(qNotify, (snap) => {
      unreadNotify = snap.size;
      updateBadge();
    }, (err) => console.log("Lỗi Firebase Notification:", err));

    // B. Tủ lạnh sắp hết hạn
    const qInv = query(collection(db, 'inventory'), where('email', '==', user.email));
    const unsubInv = onSnapshot(qInv, (snap) => {
      const today = startOfDay(new Date());
      let count = 0;
      snap.docs.forEach(d => {
        const data = d.data();
        if (data.expiryDate) {
          try {
            let expDate = data.expiryDate.toDate ? data.expiryDate.toDate() : new Date(data.expiryDate);
            if (differenceInDays(startOfDay(expDate), today) <= 3) count++;
          } catch (e) { console.log("Lỗi date:", data.name); }
        }
      });
      expiredInv = count;
      updateBadge();
    });

    // C. Admin (Bài đăng chờ duyệt)
    let unsubAdmin = () => {};
    getDoc(doc(db, "users", user.email)).then(userDoc => {
      if (userDoc.exists() && userDoc.data()?.role === 'admin') {
        const qAdmin = query(collection(db, "suggested_recipes"), where("status", "==", "pending"));
        unsubAdmin = onSnapshot(qAdmin, (snap) => {
          pendingAdmin = snap.size;
          updateBadge();
        });
      }
    });

    return () => {
      unsubNotify();
      unsubInv();
      unsubAdmin();
    };
  }, []);

  return (
    <BadgeContext.Provider value={badgeCount}>
      {children}
    </BadgeContext.Provider>
  );
};
